"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../actions";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Settings() {
    return  (
        <div>
            <p className="text-center flex flex-col items-center justify-center h-screen">i don't know what settings to display...</p>
            <Link href="/">Back</Link>
        </div>
            )
}