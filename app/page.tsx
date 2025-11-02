import { Button } from "@whop/react/components";
import Link from "next/link";

export default function Page() {
	return (
		<div className="py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto rounded-3xl bg-gray-a2 p-4 border border-gray-a4">
				<div className="text-center mt-8 mb-12">
					<h1 className="text-8 font-bold text-gray-12 mb-4">
						AI Coach Bot
					</h1>
					<p className="text-4 text-gray-10">
						An intelligent chatbot that learns from your community's knowledge base
					</p>
				</div>

				<div className="justify-center flex flex-col gap-4 w-full">
					<p className="text-3 text-gray-10 text-center">
						Configure your bot in the experience dashboard after installation.
					</p>
					<Link
						href="https://docs.whop.com/apps"
						className="w-full"
						target="_blank"
					>
						<Button variant="classic" className="w-full" size="4">
							Whop Developer Docs
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
