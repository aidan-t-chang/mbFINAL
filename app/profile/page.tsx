"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getFriends } from "../actions";
import ProfileView from "./ProfileView";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Profile() {
    const { data: user, isLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const loggedInUser = await getCurrentUser();
            return loggedInUser || null;
        }
    });

    const [userFriends, setUserFriends] = useState<any[]>([]);

    useEffect(() => {
        getFriends().then(result => {
            if (result.success) {
                setUserFriends(result.friends || []);
            } else {
                setUserFriends([]);
            }
        });
    }, []);

    if (!user) {
        return <p className="text-center flex flex-col items-center justify-center h-screen">Loading...</p>;
    }

    return <ProfileView profileUser={user} isOwnProfile={true} currentUserFriends={userFriends} profileFriends={userFriends} />;
}