export default function ForbiddenPage() {
	return (
		<main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 p-8 text-center">
			<h1 className="text-3xl font-semibold">403 Forbidden</h1>
			<p className="text-sm text-slate-600">You do not have permission to access this page.</p>
		</main>
	);
}
