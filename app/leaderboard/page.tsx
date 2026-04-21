"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../actions";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LeaderboardItem from "./LeaderboardItem";
import { getLeaderboard } from "../actions";
import Link from "next/link";

const fetchLeaderboard = async () => {
    const response = await fetch("http://localhost:4000/api/leaderboard?limit=50");
    if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
    };
    return response.json();
};

export default function Leaderboard() {
    const { data: response, isLoading, error } = useQuery({
        queryKey: ["leaderboard"],
        queryFn: () => getLeaderboard(50),
        staleTime: 1000 * 60,
    });

    if (isLoading) {
        return <p className="text-center flex flex-col items-center justify-center h-screen">Loading...</p>;
    }

    if (error) {
        return <p className="text-center flex flex-col items-center justify-center h-screen">Error loading leaderboard: {(error as Error).message}</p>;
    }

    return (
        <div className="leaderboard-view flex flex-col items-center justify-center h-screen text-center">
            <h1> Leaderboard </h1>
            <div>
                {response?.users?.map((user: any, index: number) => (
                    <LeaderboardItem key={user.id} user={user} place={index + 1} />
                ))}
            </div>
            <Link href="/">Back</Link>
        </div>
    )
}