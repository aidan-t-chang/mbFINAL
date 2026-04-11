"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getPendingFriendRequests, getFriends } from "../actions";
import toast from "react-hot-toast";

export default function Friends() {
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    useEffect(() => {
        const fetchFriendRequests = async () => {
            const result = await getPendingFriendRequests();
            if (!result) {
                toast.error("Failed to fetch friend requests");
                return;
            }
            if (result.success) {
                setFriendRequests(result.requests || []);
            } else {
                toast.error(result.error || "Unknown error");
            }
        };
        fetchFriendRequests();

        const fetchFriends = async () => {
            const result = await getFriends();
            if (!result) {
                toast.error("Failed to fetch friends");
                return;
            }
            if (result.success) {
                setFriends(result.friends || []);
            } else {
                toast.error(result.error || "Unknown error");
            }
        };
        fetchFriends();
    }, []);

    return (
        <div>
            <p>hello this is the friends page</p><br></br>
            <h2>Pending Friend Requests</h2>
            {friendRequests.length === 0 ? (
                <p>You have no pending friend requests.</p>
            ) : (
                <ul>
                    {friendRequests.map((request) => (
                        <li key={request.user.id}>
                            <span>{request.user.username}</span>
                        </li>
                    ))}
                </ul>
            )}<br></br>
            <h2>Your Friends</h2>

        </div>
    )
}