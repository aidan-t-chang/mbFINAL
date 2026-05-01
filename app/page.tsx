"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./home.css";
import { getCurrentUser, logout, updateLastOnline } from "./actions";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const loggedInUser = await getCurrentUser();
      return loggedInUser || null;
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // i need this for the commit

  const handleLogout = async () => {
    queryClient.setQueryData(["currentUser"], null);

    try {
      await logout();
      toast.success("Logged out successfully!");
    } catch (e) {
      toast.error("Error logging out: " + e);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    }
    router.push("/login");
  };

  if (isLoading) {
    return <div className="home-container flex flex-col items-center justify-center h-screen text-center">loading...</div>;
  }

  return (
    <div className="home-container flex flex-col items-center justify-center h-screen text-center">
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