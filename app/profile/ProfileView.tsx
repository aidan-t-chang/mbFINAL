"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../actions";
import toast from "react-hot-toast";

export default function ProfileView({ profileUser, isOwnProfile, currentUserFriends, profileFriends }: { profileUser: any, isOwnProfile: boolean, currentUserFriends: any[], profileFriends: any[] }) {
    const winLossRatio = profileUser.wins + profileUser.losses > 0 ? (profileUser.wins / (profileUser.wins + profileUser.losses)).toFixed(2) : "N/A";
    const winrate = profileUser.wins / (profileUser.wins + profileUser.losses) * 100;
    return (
        <div>
            <h1>{profileUser.username}'s Profile</h1><br></br>
            <p>{profileUser.friends} friends</p>
            <p>{profileUser.timePlayed} hours</p><br></br>
            <p>Rank: {profileUser.rank} ({profileUser.mbrr}mbrr)</p><br></br>
            <p>Level {profileUser.level}</p><br></br>
            <p>W/L Ratio: {winLossRatio} ({profileUser.wins}W / {profileUser.losses}L)</p><br></br>
            <p>Winrate: {winrate.toFixed(2)}%</p><br></br>

            {isOwnProfile ? (
                <div>
                    <h2>Your Friends</h2>
                    {currentUserFriends.length === 0 ? (
                        <p>You have no friends yet. Find some friends to play with!</p>
                    ) : (
                        <ul>
                            {currentUserFriends.map((friend) => (
                                <li key={friend.id}>{friend.username}</li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : <div>
                <h2>{profileUser.username}'s Friends</h2>
                {profileFriends.length === 0 ? (
                    <p>{profileUser.username} has no friends yet.</p>
                ) : (
                    <ul>
                        {profileFriends.map((friend) => (
                            <li key={friend.id}>{friend.username}</li>
                        ))}
                    </ul>
                )}
                </div>
            }

            {isOwnProfile ? (
                <button>Edit Profile</button>
            ) : <button>Add Friend</button>}
        </div>
    )
}