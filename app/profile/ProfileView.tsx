"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, sendFriendRequest } from "../actions";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProfileView({ profileUser, isOwnProfile, currentUserFriends, profileFriends, numFriends }: { profileUser: any, isOwnProfile: boolean, currentUserFriends: any[], profileFriends: any[], numFriends: number }) {
    const winLossRatio = profileUser.wins + profileUser.losses > 0 ? (profileUser.wins / (profileUser.wins + profileUser.losses)).toFixed(2) : "N/A";
    const winrate = (profileUser.wins + profileUser.losses === 0) ? 0 : profileUser.wins / (profileUser.wins + profileUser.losses) * 100;

    const handleAddFriend = async () => {
        const result = await sendFriendRequest(profileUser.id);
        if (result.success) {
            toast.success(`friend request sent to ${profileUser.username}`);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="profile-view flex flex-col items-center justify-center h-screen text-center">
            <h1>{profileUser.username}'s Profile</h1><br></br>
            <p>{numFriends} friends</p>
            <p>{profileUser.timePlayed} hours</p><br></br>
            <p>Rank: {profileUser.rank} ({profileUser.mbrr}mbrr)</p><br></br>
            <p>Level {profileUser.level} ({profileUser.totalExp.toLocaleString()} total xp)</p><br></br>
            <p>{profileUser.wins} wins / {profileUser.losses} losses</p><br></br>
            <p>{profileUser.gamesPlayed} games played</p>
            <p>Winrate: {winrate.toFixed(2)}%</p><br></br>
            <p>Average Answer Time: {profileUser.avgAnswertime}ms</p>

            {isOwnProfile ? (
                <div>
                    <h2>Your Friends</h2>
                    {currentUserFriends.length === 0 ? (
                        <p>You have no friends yet. Find some friends to play with!</p>
                    ) : (
                        <ul>
                            {currentUserFriends.map((friend) => { 
                                const isSender = friend.userId === profileUser.id;
                                const actualFriend = isSender ? friend.friend : friend.user;
                                return (
                                    <Link href={`/profile/${actualFriend.username}`} key={friend.id}>
                                        {actualFriend.username}
                                    </Link>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : <div>
                <h2>{profileUser.username}'s Friends</h2>
                {profileFriends.length === 0 ? (
                    <p>{profileUser.username} has no friends yet.</p>
                ) : (
                    <ul>
                        {profileFriends.map((friend) => {
                            const isSender = friend.userId === profileUser.id;
                            const actualFriend = isSender ? friend.friend : friend.user;
                            return (
                                <Link href={`/profile/${actualFriend.username}`} key={friend.id}>
                                    {actualFriend.username}
                                </Link>
                            );
                        })}
                    </ul>
                )}
                </div>
            }

            {isOwnProfile ? (
                <button>Edit Profile</button>
            ) : <button onClick={handleAddFriend}>Add Friend</button>}
            <Link href="/">Back</Link>
        </div>
    )
}