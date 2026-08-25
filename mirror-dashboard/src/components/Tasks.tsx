import { useEffect, useState } from 'react';

interface Task {
  id: string;
  content: string;
  completed?: boolean;
  due?: {
    date: string;
    string?: string;
  } | null;
}

type ApiResponse = Task[] | { results?: Task[] };
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const normalizeTasks = (payload: ApiResponse): Task[] => {
  if (Array.isArray(payload)) {
    return payload.filter((task) => task && !task.completed).slice(0, 5);
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results.filter((task) => task && !task.completed).slice(0, 5);
  }

  return [];
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data: ApiResponse = await response.json();
        setTasks(normalizeTasks(data));
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Tasks offline');
      }
    };

    fetchTasks();

    const refreshTimer = window.setInterval(() => {
      fetchTasks();
    }, FIVE_MINUTES_MS);

    const sse = new EventSource('http://localhost:3001/api/tasks/stream');

    sse.onopen = () => {
      console.log('Todoist stream connected');
    };

    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data || '{}');
        if (payload && payload.item && payload.item.content) {
          console.log('Todoist update received with item payload. Updating tasks locally...');
          setTasks((prev) => {
            const newTask: any = payload.item;
            if (newTask.completed) return prev;
            if (prev.find((t) => String(t.id) === String(newTask.id))) return prev;
            const merged = [newTask, ...prev];
            return normalizeTasks(merged as ApiResponse);
          });
          setError(null);
          return;
        }
      } catch (err) {
        // ignore parse errors
      }
      console.log('Todoist update received. Refreshing tasks...');
      fetchTasks();
    };

    sse.addEventListener('task-update', (e) => {
      try {
        const payload = JSON.parse(e.data || '{}');
        if (payload && payload.item && payload.item.content) {
          console.log('Task update event received with item payload. Updating tasks locally...');
          setTasks((prev) => {
            const newTask: any = payload.item;
            if (newTask.completed) return prev;
            if (prev.find((t) => String(t.id) === String(newTask.id))) return prev;
            const merged = [newTask, ...prev];
            return normalizeTasks(merged as ApiResponse);
          });
          setError(null);
          return;
        }
      } catch (err) {
        // ignore parse errors
      }
      console.log('Task update event received. Refreshing tasks...');
      fetchTasks();
    });

    sse.onerror = () => {
      setError('Tasks offline');
    };

    return () => {
      window.clearInterval(refreshTimer);
      sse.close();
    };
  }, []);

  if (error) return <p>{error}</p>;
  if (tasks.length === 0) return <p>All caught up!</p>;

  return (
    <>
      <h3 style={{ marginBottom: '1rem' }}>To Do</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li key={task.id} style={{ marginBottom: '0.8rem' }}>
            <div style={{ fontSize: '1.2rem', color: '#ffffff' }}>{task.content}</div>
            {task.due && (
              <div style={{ fontSize: '0.9rem', color: '#ffaaaa' }}>
                Due: {task.due.string || task.due.date}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};

export default Tasks;