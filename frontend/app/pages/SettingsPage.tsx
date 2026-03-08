const SettingsPage = () => (
  <div className="max-w-2xl mx-auto fade-in">
    <div className="bg-card border border-border rounded-xl p-6 space-y-6" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h2 className="text-base font-semibold text-foreground">Account Settings</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Name</p>
            <p className="text-xs text-muted-foreground">Dr. Sarah Chen</p>
          </div>
          <button className="text-xs text-primary font-medium hover:underline">Edit</button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="text-xs text-muted-foreground">sarah.chen@admissions.edu</p>
          </div>
          <button className="text-xs text-primary font-medium hover:underline">Edit</button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Role</p>
            <p className="text-xs text-muted-foreground">Senior Admissions Officer</p>
          </div>
          <span className="text-xs text-muted-foreground">Contact admin to change</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-foreground">AI Question Generation</p>
            <p className="text-xs text-muted-foreground">Auto-generate questions on profile parse</p>
          </div>
          <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-primary-foreground absolute right-0.5 top-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SettingsPage;