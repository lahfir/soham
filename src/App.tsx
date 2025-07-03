import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

function App() {
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  async function refresh() {
    const res: { paused: boolean } = await invoke("status");
    setPaused(res.paused);
  }

  async function toggle() {
    await invoke(paused ? "resume" : "pause");
    refresh();
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tracker Agent</h1>
      <div className="flex items-center gap-4">
        <Button variant={paused ? "destructive" : "default"} onClick={toggle}>
          {paused ? "Resume" : "Pause 30m"}
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" onClick={async () => setLogs(await invoke("get_logs", { limit: 100 }))}>
              View Activity Logs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Recent Activity (last {logs.length})</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Time</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Window / Title</TableHead>
                    <TableHead className="w-20 text-right">PID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(l.ts * 1000), "HH:mm:ss")}</TableCell>
                      <TableCell>{l.app_id}</TableCell>
                      <TableCell className="truncate max-w-md">{l.window_title}</TableCell>
                      <TableCell className="text-right">{l.pid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

export default App;
