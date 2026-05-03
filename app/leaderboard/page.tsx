"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../actions";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LeaderboardItem from "./LeaderboardItem";
import { getLeaderboard } from "../actions";
import Link from "next/link";

export default function Leaderboard() {
    const [currentLeaderboard, setCurrentLeaderboard] = useState<"mbrr" | "totalExp">("mbrr");
    const { data: response, isLoading, error } = useQuery({
        queryKey: [`${currentLeaderboard}_leaderboard`],
        queryFn: () => getLeaderboard(50, currentLeaderboard),
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
            <select className="mb-4 p-2 border rounded" value={currentLeaderboard} onChange={(e) => setCurrentLeaderboard(e.target.value as "mbrr" | "totalExp")}>
                <option value="mbrr">MBRR</option>
                <option value="totalExp">Total EXP</option>
            </select>

            <div>
                {}
                {response?.users?.map((user: any, index: number) => (
                    <LeaderboardItem key={user.id} user={user} place={index + 1} version={currentLeaderboard} />
                ))}
            </div>
            <Link href="/">Back</Link>
        </div>
    )
}