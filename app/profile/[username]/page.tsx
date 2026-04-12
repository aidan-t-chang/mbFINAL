"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCurrentUser, getUserByUsername, getFriends, getFriendsByUserId } from "../../actions";
import ProfileView from "../ProfileView";
    
export default function OtherProfile() {
    const { username } = useParams();
    const [profileUser, setProfileUser] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentUserFriends, setCurrentUserFriends] = useState<any[]>([]);
    const [profileFriends, setProfileFriends] = useState<any[]>([]);

    useEffect(() => {
        getCurrentUser().then(setCurrentUser);
        getUserByUsername(username as string).then(setProfileUser);
    }, [username]);

    useEffect(() => {
        if (currentUser) {
            getFriends().then(result => {
                if (result.success) {
                    setCurrentUserFriends(result.friends || []);
                } else {
                    setCurrentUserFriends([]);
                }
            });
        }
    }, [currentUser]);

    useEffect(() => {
        if (profileUser) {
            getFriendsByUserId(profileUser.id).then(result => {
                if (result.success) {
                    setProfileFriends(result.friends || []);
                } else {
                    setProfileFriends([]);
                }
            });
        }
    }, [profileUser]);

    if (!profileUser) {
        return <p>Loading...</p>;
    }

    const isOwnProfile = currentUser?.id === profileUser.id;

    // get currentuserfriends and profilefriends in the future
    return <ProfileView profileUser={profileUser} isOwnProfile={isOwnProfile} currentUserFriends={currentUserFriends} profileFriends={profileFriends} />;
}