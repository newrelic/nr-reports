package com.newrelic.labs.reports;

import com.newrelic.labs.reports.model.Metadata;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

public class SyncJob implements Job {
	private static final Logger LOGGER =
		Logger.getLogger(SyncJob.class.getName());

	private final Util util = Util.getInstance();

	private void pollAccount(
		NerdgraphClient client,
		String accountId
	) throws SyncException {
		Metadata metadata = this.util.loadMetadata(client, accountId);
		long lastModifiedDate = metadata.getLastModifiedDate();
		long lastPolledDate = metadata.getLastPolledDate();

		if (LOGGER.isLoggable(Level.FINEST)) {
			LOGGER.finest(String.format(
				"lastModified: %s; lastPolled: %s",
				this.util.toIsoString(lastModifiedDate),
				this.util.toIsoString(lastPolledDate)
			));
		}

		if (lastModifiedDate < lastPolledDate) {
			LOGGER.info(
				"Last modified is less than last polled, exiting."
			);
			return;
		}

		this.util.downloadManifest(client, accountId);

		try {
			String scheduleGroupName = this.util.getScheduleGroupName();

			LOGGER.finest("signalling HUP for account ID " + accountId);

			this.util.hup(accountId, lastPolledDate, scheduleGroupName);

			metadata.setLastPolledDate(System.currentTimeMillis());

			this.util.storeMetadata(client, accountId, metadata);
		} catch (IOException e) {
			throw new SyncException(
				"hup failed for account ID " + accountId,
				e
			);
		}
	}

	public void execute(
		JobExecutionContext context
	) throws JobExecutionException {
		try {
			LOGGER.info("executing sync job");

			String[] accountIds = this.util.requireAccountIds();
			NerdgraphClient client = this.util.createNerdgraphClient(this.util);

			for (String accountId : accountIds) {
				pollAccount(client, accountId);
			}
		} catch (SyncException e) {
			LOGGER.log(Level.SEVERE, "sync failed", e);
			throw new JobExecutionException(
				"sync failed",
				e
			);
		} catch (Throwable t) {
			LOGGER.log(
				Level.SEVERE,
				"sync failed due to unexpected exception",
				t
			);
			throw new JobExecutionException(
				"sync failed due to unexpected exception",
				t
			);
		}
	}
}
