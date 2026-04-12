"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getFriends } from "../actions";
import ProfileView from "./ProfileView";

export default function Profile() {
    const [user, setUser] = useState<any>(null);
    const [userFriends, setUserFriends] = useState<any[]>([]);

    useEffect(() => {
        getCurrentUser().then(setUser);
        getFriends().then(result => {
            if (result.success) {
                setUserFriends(result.friends || []);
            } else {
                setUserFriends([]);
            }
        });
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    // get currentuserfriends and profilefriends in the future
    return <ProfileView profileUser={user} isOwnProfile={true} currentUserFriends={userFriends} profileFriends={userFriends} />;
}