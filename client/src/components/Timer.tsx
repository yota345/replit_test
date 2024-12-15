import { useState, useEffect } from "react";
import { Play, Pause, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, TimeEntry } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

export default function Timer() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery<Project[]>({ 
    queryKey: ['/api/projects']
  });

  const createTimeEntry = useMutation<TimeEntry, Error, { projectId: number, startTime: Date, endTime: Date }>({
    mutationFn: async (data) => {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      toast({
        title: "Time entry saved",
        description: "Your time entry has been recorded successfully.",
      });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!selectedProject) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a project first",
      });
      return;
    }
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handleStop = async () => {
    if (!startTime || !selectedProject) return;
    
    setIsRunning(false);
    const endTime = new Date();
    
    try {
      await createTimeEntry.mutateAsync({
        projectId: parseInt(selectedProject),
        startTime,
        endTime,
      });
      
      setTime(0);
      setStartTime(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-4xl font-mono text-center py-4">
            {formatTime(time)}
          </div>

          <div className="flex justify-center space-x-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              disabled={!selectedProject || time === 0}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={!isRunning}
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}