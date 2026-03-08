export default function InterviewsPage() {
  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="bg-card border border-border rounded-xl p-12 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">No Interviews Scheduled</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Generate interview questions from a candidate profile to see scheduled interviews here.
        </p>
      </div>
    </div>
  );
}
