import { useState, useEffect } from 'react';

// 1. Define the shape of individual tasks in the new API
interface Task {
  id: string;
  content: string;
  due?: {
    date: string;
    string?: string;
  } | null;
}

// 2. Define the outer API wrapper response shape
interface ApiResponse {
  results: Task[];
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data: ApiResponse = await response.json();

        if (data && Array.isArray(data.results)) {
          setTasks(data.results.slice(0, 5));
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error(err);
        setError('Tasks offline');
      }
    };

    fetchTasks();

    const sse = new EventSource('http://localhost:3001/api/tasks/stream');

    sse.onmessage = () => {
      console.log('Update received! Fetching fresh tasks...');
      fetchTasks();
    };

    return () => {
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