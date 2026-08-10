import { useState, useEffect } from 'react';

export default function Clock() {
  // Initialize state with the current date/time
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update the time every 1000 milliseconds (1 second)
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup the interval if the component ever unmounts
    return () => clearInterval(timer);
  }, []);

  // Format the time: e.g., "3:34 PM"
  const formattedTime = time.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  });

  // Format the date: e.g., "Monday, August 10"
  const formattedDate = time.toLocaleDateString([], { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <div>{formattedDate}</div>
      <div>{formattedTime}</div>
      
    </>
  );
}