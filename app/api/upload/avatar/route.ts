import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/upload/avatar - Upload bot avatar image
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		let userId: string;
		try {
			const result = await whopsdk.verifyUserToken(await headers());
			userId = result.userId;
		} catch (authError: any) {
			return NextResponse.json(
				{ error: "Authentication failed", details: authError.message },
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}
		const formData = await request.formData();

		const experienceId = formData.get("experience_id") as string;
		const file = formData.get("file") as File | null;

		if (!experienceId) {
			return NextResponse.json({ error: "experience_id is required" }, { status: 400 });
		}

		if (!file) {
			return NextResponse.json({ error: "File is required" }, { status: 400 });
		}

		// Verify admin access
		const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
		if (access.access_level !== "admin") {
			return NextResponse.json({ error: "Admin access required" }, { status: 403 });
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			return NextResponse.json({ error: "File must be an image" }, { status: 400 });
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
		}

		// Generate unique filename
		const fileExt = file.name.split(".").pop();
		const fileName = `avatar_${experienceId}_${Date.now()}.${fileExt}`;
		const filePath = `bot-avatars/${fileName}`;

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to Supabase Storage
		// Note: Make sure you have a 'bot-avatars' bucket in Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from("bot-avatars")
			.upload(filePath, buffer, {
				contentType: file.type,
				upsert: false,
			});

		if (uploadError) {
			console.error("Error uploading to Supabase:", uploadError);
			
			// Fallback: Return base64 data URL if Supabase storage is not configured
			const base64 = buffer.toString("base64");
			const dataUrl = `data:${file.type};base64,${base64}`;
			
			return NextResponse.json({
				url: dataUrl,
				method: "base64",
				note: "Supabase Storage not configured. Using base64. Configure a 'bot-avatars' bucket in Supabase for better performance.",
			});
		}

		// Get public URL
		const { data: urlData } = supabase.storage.from("bot-avatars").getPublicUrl(filePath);

		return NextResponse.json({
			url: urlData.publicUrl,
			method: "storage",
		});
	} catch (error: any) {
		console.error("Error uploading avatar:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to upload avatar" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

