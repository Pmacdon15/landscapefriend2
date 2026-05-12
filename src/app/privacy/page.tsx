export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-slate-100">Privacy Policy</h1>
      
      <div className="space-y-6 text-slate-600 dark:text-slate-400">
        <p className="text-lg leading-relaxed">
          Your privacy is important to us. This policy explains how we handle your data.
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Data Collection and Use</h2>
          <p>
            We only store data that is necessary for the benefit of using the app. This includes information you provide about your clients, schedules, and service logs.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Data Security</h2>
          <p>
            Your data is safe with us. We take reasonable measures to protect your information from unauthorized access.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Third-Party Sharing</h2>
          <p>
            <strong className="text-slate-900 dark:text-slate-100">We never sell your data.</strong> We only share your information with essential service providers necessary to run the application, such as Neon DB for database hosting.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Contact</h2>
          <p>
            If you have any questions about this policy, please contact us at <a href="mailto:patrick@patmac.ca" className="text-primary hover:underline">patrick@patmac.ca</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
