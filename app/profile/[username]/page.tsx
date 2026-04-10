"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCurrentUser, getUserByUsername } from "../../actions";
import ProfileView from "../ProfileView";
    
export default function OtherProfile() {
    const { username } = useParams();
    const [profileUser, setProfileUser] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        getCurrentUser().then(setCurrentUser);
        getUserByUsername(username as string).then(setProfileUser);
    }, [username]);

    if (!profileUser) {
        return <p>Loading...</p>;
    }

    const isOwnProfile = currentUser?.id === profileUser.id;

    // get currentuserfriends and profilefriends in the future
    return <ProfileView profileUser={profileUser} isOwnProfile={isOwnProfile} currentUserFriends={[]} profileFriends={[]} />;
}