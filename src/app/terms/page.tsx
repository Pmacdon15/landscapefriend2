export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-slate-100">Terms of Service</h1>
      
      <div className="space-y-6 text-slate-600 dark:text-slate-400">
        <p className="text-lg leading-relaxed">
          By using Scheduler App, you agree to the following terms.
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Service Availability</h2>
          <p>
            The service is provided "as is". We aim for high availability but cannot guarantee uninterrupted service.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Free Tier Limitations</h2>
          <p>
            Features on the free tier are subject to change without warning. We reserve the right to modify or remove features as the application evolves.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">User Responsibilities</h2>
          <p>
            Users are responsible for the data they input into the system and ensuring they have the right to manage their client information.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the app constitutes acceptance of the updated terms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-4 text-slate-900 dark:text-slate-100">Contact</h2>
          <p>
            For any inquiries regarding these terms, please contact <a href="mailto:patrick@patmac.ca" className="text-primary hover:underline">patrick@patmac.ca</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
