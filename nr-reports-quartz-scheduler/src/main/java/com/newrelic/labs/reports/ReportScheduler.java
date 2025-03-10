package com.newrelic.labs.reports;

import org.quartz.CronTrigger;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.impl.StdSchedulerFactory;

import java.io.IOException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

public class ReportScheduler {
	private static final Logger LOGGER =
		Logger.getLogger(ReportScheduler.class.getName());

	private final Util util;

	public ReportScheduler(Util util) {
		this.util = util;
	}

	public void bootstrap() throws SyncException, IOException {
		LOGGER.info("bootstrapping");

		String logLevel = this.util.getenv("LOG_LEVEL");

		if (logLevel != null && !logLevel.isEmpty()) {
			try {
				// Set root logger level to specified level
				Level level = Level.parse(logLevel.toUpperCase());
				Logger.getLogger("").setLevel(level);
			} catch (IllegalArgumentException e) {
				LOGGER.info("ignoring invalid log level " + logLevel);
			}
		}

		String[] accountIds = this.util.requireAccountIds();
		NerdgraphClient client = this.util.createNerdgraphClient(this.util);
		String scheduleGroupName = this.util.getScheduleGroupName();

		for (String accountId : accountIds) {
			this.util.downloadManifest(client, accountId);

			// Intentionally specify 0 for lastPolledDate to force a refresh
			this.util.hup(accountId, 0, scheduleGroupName);
		}
	}

	@SuppressWarnings("InfiniteLoopStatement")
	public void run() {
		try {
			bootstrap();
		} catch (SyncException | IOException e) {
			LOGGER.log(Level.SEVERE, "bootstrap failed", e);
			return;
		}

		try {
			final Scheduler scheduler =
				StdSchedulerFactory.getDefaultScheduler();
			String syncSchedule = this.util.getenv(
				"SYNC_SCHEDULE",
				"0 */5 * * * ?"
			);
			JobDetail job = newJob(SyncJob.class)
				.withIdentity("sync", "default")
				.build();
			CronTrigger trigger = newTrigger()
				.withIdentity("syncTrigger", "default")
				.withSchedule(cronSchedule(syncSchedule))
				.build();

			LOGGER.info(
				"scheduling sync job with schedule " +
				syncSchedule
			);
			scheduler.scheduleJob(job, trigger);

			LOGGER.info("starting scheduler");
			scheduler.start();

			Runtime.getRuntime().addShutdownHook(new Thread(() -> {
				try {
					LOGGER.info("stopping scheduler");
					scheduler.shutdown();
				} catch (SchedulerException e) {
					LOGGER.log(
						Level.WARNING,
						"scheduler failed to shutdown properly",
						e
					);
				}
			}));

			try {
				ArrayBlockingQueue<Integer> queue =
					new ArrayBlockingQueue<>(1);

				// The infinite loop here is intentional in order to let the
				// scheduler thread to schedule and run jobs as needed without
				// the main thread ending.
				while (true) {
					try {
						LOGGER.finest("hibernating...");
						// wait forever
						queue.take();
					} catch (InterruptedException e) {
						LOGGER.log(Level.FINEST, "main thread woke up", e);
					} catch (Throwable t) {
						LOGGER.log(Level.SEVERE, "unexpected failure", t);
						throw t;
					}
				}
			} finally {
				LOGGER.info("stopping scheduler");
				scheduler.shutdown();
			}
		} catch (SchedulerException e) {
			LOGGER.log(Level.SEVERE, "scheduler failed", e);
		}
	}

	public static void main(String[] args) {
		new ReportScheduler(Util.getInstance()).run();
	}
}
