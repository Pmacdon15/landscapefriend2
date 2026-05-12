import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md w-full py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
              Scheduler App
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">
              Efficient scheduling and management for your service business.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Legal & Privacy
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Contact & Social
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:patrick@patmac.ca"
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                patrick@patmac.ca
              </a>
              <a
                href="https://github.com/pmacdon15"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                pmacdon15
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center leading-relaxed">
            Your data is safe and will never be sold. We only store it for the benefit of using the app and share it only with essential service providers like Neon DB. Features on the free tier may change without warning.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-2">
            © {new Date().getFullYear()} Scheduler App. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
