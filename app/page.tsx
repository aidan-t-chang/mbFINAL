"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./home.css";

const generateRoomId = () => Math.random().toString(36).substring(2, 8);
function Home() {
  const router = useRouter();

  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      router.push(`/game/${joinRoomId.trim()}`); 
    }
  };

  useEffect(() => {
    setRoomId(generateRoomId());
    const ws = new WebSocket("ws://localhost:8081");

    ws.onmessage = ({ data }) => {
      console.log("message from server: ", data);
      setMessages((prev) => [...prev, data]);
    };

    setSocket(ws);

  }, []);

  return (
    <div className="home-container">
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
        <Link href="/login">create account</Link>
      </div>
      <div>
        <Link href={`/game/${roomId}`}>create new game</Link>
      </div>
      <div>
        <input 
          type="text"
          placeholder="room id"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
        />
        <button onClick={handleJoinRoom} disabled={!joinRoomId}>join game</button>
      </div>
    </div>
  )
}

export default Home;