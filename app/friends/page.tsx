"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getPendingFriendRequests, getFriends, acceptFriendRequest } from "../actions";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Friends() {
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        getCurrentUser().then(setCurrentUser);
    }, []);

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

    const handleAcceptRequest = async (userId: number, friendId: number) => {
        await acceptFriendRequest(userId, friendId);
        toast.success("Friend request accepted!");
        // Refresh friend requests and friends list
        const updatedRequests = await getPendingFriendRequests();
        if (updatedRequests.success) {
            setFriendRequests(updatedRequests.requests || []);
        }
        const updatedFriends = await getFriends();
        if (updatedFriends.success) {
            setFriends(updatedFriends.friends || []);
        }
    }

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
                            <button onClick={() => handleAcceptRequest(request.userId, request.friendId)}>Accept</button>
                        </li>
                    ))}
                </ul>
            )}<br></br>
            <h2>Your Friends</h2>
            {friends.length === 0 ? (
                <p>You have no friends yet.</p>
            ) : (
                <ul>
                    {friends.map((friend) => {
                        const isSender = friend.userId === currentUser?.id;
                        const actualFriend = isSender ? friend.friend : friend.user;
                        return (
                            <li key={friend.id}>
                                <Link href={`/profile/${actualFriend.username}`}>{actualFriend.username}</Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    )
}