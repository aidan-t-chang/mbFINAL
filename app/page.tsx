"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./home.css";
import { getCurrentUser, logout } from "./actions";
import toast from "react-hot-toast";

const generateRoomId = () => Math.random().toString(36).substring(2, 8);
function Home() {
  const router = useRouter();

  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [user, setUser] = useState<any>(null);

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      router.push(`/game/${joinRoomId.trim()}`); 
    }
  };

  useEffect(() => {
    async function fetchUser() {
      const loggedInUser = await getCurrentUser();
      if (!loggedInUser) {
        router.push("/login");
      }
      setUser(loggedInUser);
    }
    fetchUser();
  }, [router]);

  useEffect(() => {  
    setRoomId(generateRoomId());
    const ws = new WebSocket("ws://localhost:8081");

    ws.onmessage = ({ data }) => {
      console.log("message from server: ", data);
      setMessages((prev) => [...prev, data]);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const handleLogout = async () => {
    setUser(null);
    try {
      await logout();
      toast.success("Logged out successfully!");
    } catch (e) {
      toast.error("Error logging out: " + e);
    }
    router.push("/");
  }

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
        {user ? (<p>hello {user.username}</p>) : 
          <Link href="/login">create account</Link>
        }
      </div>
      {user && (
        <button onClick={handleLogout}>log out</button>
      )}
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