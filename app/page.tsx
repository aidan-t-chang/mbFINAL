"use client";

import { useEffect, useState } from "react";


function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8081");

    ws.onmessage = ({ data }) => {
      console.log("message from server: ", data);
      setMessages((prev) => [...prev, data]);
    };

    setSocket(ws);

  }, []);

  return (
    <>
      <div>
        <h1>Messages</h1>
        <ul>
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
        <button onClick={() => socket?.send("hello")}>Send messages</button>
      </div>
      <div>
        <button>login</button>
      </div>
    </>
  )
}

export default Home;