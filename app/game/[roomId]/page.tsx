"use client";

import { useEffect, useState, use } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import "./game.css";

export default function Game({ params }: { params: Promise<{ roomId: string }> }) {
    const resolvedParams = use(params);

    useEffect(() => {
        console.log("room id: ", resolvedParams.roomId);
    }, [resolvedParams.roomId]);

    return (
        <div>
            <p style={{ textAlign: "center", marginTop: "20%" }}>hi</p>
            <p style={{ textAlign: "center"}}>room {resolvedParams.roomId}</p>
            <Link href="/" >home</Link>
        </div>
    )
}
