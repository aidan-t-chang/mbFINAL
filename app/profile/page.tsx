"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getFriends } from "../actions";
import ProfileView from "./ProfileView";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function Profile() {
    const router = useRouter();
    const { data: user, isLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const loggedInUser = await getCurrentUser();
            return loggedInUser || null;
        }
    });

    const { data: userFriends = [], isLoading: isFriendsLoading } = useQuery({
        queryKey: ["userFriends"],
        queryFn: async () => {
            const result = await getFriends();
            return result.success ? (result.friends || []) : [];
        },
        enabled: !!user,
    })

    const { data: userFriendsLength = 0 } = useQuery({
        queryKey: ["userFriendsLength"],
        queryFn: async () => {
            const result = await getFriends();
            return result.success ? (result.numFriends || 0) : 0;
        },
    })

    if (isLoading || isFriendsLoading) {
        return <p className="text-center flex flex-col items-center justify-center h-screen">Loading...</p>;
    }

    if (!user) {
        router.push("/login");
    }

    return <ProfileView profileUser={user} isOwnProfile={true} currentUserFriends={userFriends} profileFriends={userFriends} numFriends={userFriendsLength} />;
}