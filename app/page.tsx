"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./home.css";
import { getCurrentUser, logout, updateLastOnline } from "./actions";
import toast from "react-hot-toast";

function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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
        {user ? (<><p>hello {user.username}</p>
          <div>
          <Link href="/play">play</Link><br></br>
          <Link href="/friends">friends</Link><br></br>
          <Link href="/leaderboard">leaderboard</Link><br></br>
          <Link href="/profile">profile</Link><br></br>
          <Link href="/settings">settings</Link><br></br>
          {user && (
            <button onClick={handleLogout}>log out</button>
          )}
        </div></>) : 
          <Link href="/login">create account</Link>
        }
      </div>

    </div>
  )
}

export default Home;

/*
navigation links:

home page:
  - play
  - friends
  - leaderboard
  - settings
  - profile
  - logout

play page:
  - casual
  - competitive (0/10 placement matches)
  - training

friends page:
  - search for users

leaderboard page:
  - click each user on leaderboard -> see profile
  - global, friends-only

settings page:
  - no other links

profile page:
  - click on each friend -> see profile
*/