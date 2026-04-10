"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../actions";
import ProfileView from "./ProfileView";

export default function Profile() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    // get currentuserfriends and profilefriends in the future
    return <ProfileView profileUser={user} isOwnProfile={true} currentUserFriends={[]} profileFriends={[]} />;
}