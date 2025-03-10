package com.newrelic.labs.reports;

import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class RunReportJob implements Job {
	private static final Logger LOGGER =
		Logger.getLogger(RunReportJob.class.getName());

	private final Util util = Util.getInstance();

	private void runReport(
		String accountId,
		String reportId,
		String publishConfigId
	) throws RunReportException {
		try {
			LOGGER.info("executing run report job");

			String licenseKey = this.util.getenv(
				"NEW_RELIC_LICENSE_KEY"
			);

			if (licenseKey == null || licenseKey.isEmpty()) {
				throw new RunReportException("missing license key");
			}

			String apiKey = this.util.getenv("NEW_RELIC_API_KEY");

			if (apiKey == null || apiKey.isEmpty()) {
				throw new RunReportException("missing api key");
			}

			String nerdletPackageId = this.util.getenv(
				"SOURCE_NERDLET_ID"
			);

			if (nerdletPackageId == null || nerdletPackageId.isEmpty()) {
				throw new RunReportException("missing source nerdlet ID");
			}

			String region = this.util.getenv(
				"NEW_RELIC_REGION",
				"US"
			);
			String nodeCmd = util.getenv("NODE_CMD", "node");
			String reportsHome = util.getenv("REPORTS_HOME", "..");

			ProcessBuilder procBuilder = new ProcessBuilder(
				nodeCmd,
				Path.of(
					reportsHome,
					"nr-reports-cli",
					"index.js"
				).toFile().getCanonicalPath()
			)
				.inheritIO()
				.directory(
					Path.of(reportsHome).toFile()
				);
			Map<String, String> environment = procBuilder.environment();

			environment.put("NEW_RELIC_API_KEY", apiKey);
			environment.put("SOURCE_NERDLET_ID", nerdletPackageId);
			environment.put("NEW_RELIC_REGION", region);
			environment.put("NEW_RELIC_ACCOUNT_ID", accountId);
			environment.put("REPORT_IDS", reportId);
			environment.put("PUBLISH_CONFIG_IDS", publishConfigId);

			if (LOGGER.isLoggable(Level.FINEST)) {
				environment.put("LOG_LEVEL", "debug");
			} else if (LOGGER.isLoggable(Level.FINE)) {
				environment.put("LOG_LEVEL", "verbose");
			}

			LOGGER.finest(
				"spawning node process for CLI using node command " +
					nodeCmd
			);

			Process proc = procBuilder.start();

			int exitValue = proc.waitFor();

			LOGGER.finest("CLI exited with code " + exitValue);
		} catch (IOException | InterruptedException e) {
			LOGGER.log(Level.SEVERE, "run report failed", e);
			throw new RunReportException(
				"run report failed",
				e
			);
		} catch (Throwable t) {
			LOGGER.log(
				Level.SEVERE,
				"run report failed due to unexpected exception",
				t
			);
			throw new RunReportException(
				"run report failed due to unexpected exception",
				t
			);
		}
	}

	public void execute(
		JobExecutionContext context
	) throws JobExecutionException {
		JobDataMap data = context.getMergedJobDataMap();
		String accountId = data.getString("accountId");
		String reportId = data.getString("reportId");
		String publishConfigId = data.getString("publishConfigId");

		try {
			if (accountId == null || accountId.isEmpty()) {
				throw new RunReportException("missing account ID");
			}

			if (reportId == null || reportId.isEmpty()) {
				throw new RunReportException("missing report ID");
			}

			if (publishConfigId == null || publishConfigId.isEmpty()) {
				throw new RunReportException("missing publish config ID");
			}

			runReport(accountId, reportId, publishConfigId);
		} catch (RunReportException e) {
			throw new JobExecutionException(
				"run report failed",
				e
			);
		}
	}
}
