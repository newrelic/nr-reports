package com.newrelic.labs.reports;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.newrelic.labs.reports.model.Manifest;
import com.newrelic.labs.reports.model.Metadata;
import com.newrelic.labs.reports.model.PublishConfig;
import com.newrelic.labs.reports.model.PublishConfigItem;
import com.newrelic.labs.reports.model.ReadDocumentResponse;
import com.newrelic.labs.reports.model.Report;
import org.quartz.CronTrigger;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.quartz.impl.StdSchedulerFactory;
import org.quartz.impl.matchers.GroupMatcher;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

public class Util {
	private static final Logger LOGGER =
		Logger.getLogger(Util.class.getName());
	private static final Util INSTANCE = new Util();

	private Util() {}

	public static Util getInstance() {
		return INSTANCE;
	}

	public String getTrimmed(String s) {
		if (s == null) {
			return null;
		}

		return s.trim();
	}

	public String getenv(String envName, String def) {
		String str = System.getenv(envName);

		if (str == null) {
			return def;
		}

		return str.trim();
	}

	public String getenv(String envName) {
		return getenv(envName, null);
	}

	public String escapeQuotes(String json) {
		return json.replaceAll(
			"\"",
			"\\\\\""
		);
	}

	public String toIsoString(long millis) {
		ZonedDateTime dateTime = ZonedDateTime.ofInstant(
			new Date(millis).toInstant(),
			ZoneOffset.UTC
		);

		return DateTimeFormatter.ISO_INSTANT.format(dateTime);
	}

	public String getScheduleGroupName() throws SyncException {
		String val = getenv("SCHEDULE_GROUP_NAME", "schedules");

		if (val == null || val.isEmpty()) {
			throw new SyncException("missing schedule group name");
		}

		return val;
	}

	public String[] requireAccountIds() throws SyncException {
		String val = getenv("REPORT_ACCOUNT_IDS");

		if (val == null || val.isEmpty()) {
			throw new SyncException("missing account ids");
		}

		return val.split("\\s*,\\s*");
	}

	private String getEndpointUrl(String region) throws SyncException {
		if (region == null || region.equalsIgnoreCase("US")) {
			return "https://api.newrelic.com/graphql";
		}

		if (region.equalsIgnoreCase("EU")) {
			return "https://api.eu.newrelic.com/graphql";
		}

		throw new SyncException("invalid New Relic region " + region);
	}

	public NerdgraphClient createNerdgraphClient(
		Util util
	) throws SyncException {
		String apiKey = getenv("NEW_RELIC_API_KEY");

		if (apiKey == null || apiKey.isEmpty()) {
			throw new SyncException("missing api key");
		}

		String nerdletPackageId = getenv("SOURCE_NERDLET_ID");

		if (nerdletPackageId == null || nerdletPackageId.isEmpty()) {
			throw new SyncException("missing source nerdlet ID");
		}

		String region = getenv("NEW_RELIC_REGION");

		return new NerdgraphClient(
			util,
			getEndpointUrl(region),
			apiKey,
			nerdletPackageId
		);
	}

	public String getReportName(Report r) {
		String name = r.getName();

		if (name != null) {
			return name;
		}

		return r.getId();
	}

	public Metadata loadMetadata(
		NerdgraphClient client,
		String accountId
	) throws SyncException {
		try {
			ReadDocumentResponse<Metadata> response = client.readDocument(
				"metadata",
				"metadata.json",
				accountId,
				// @see https://github.com/google/gson/blob/main/UserGuide.md#serializing-and-deserializing-generic-types
				new TypeToken<ReadDocumentResponse<Metadata>>() {}.getType()
			);
			Metadata m = response.getDocument();

			if (m == null) {
				throw new SyncException(
					"missing metadata/metadata.json in nerdstorage for account ID "
						+ accountId
				);
			}

			return m;
		} catch (NerdgraphQueryException e) {
			throw new SyncException(
				"failed to read metadata for account ID " + accountId,
				e
			);
		}
	}

	public void storeMetadata(
		NerdgraphClient client,
		String accountId,
		Metadata metadata
	) throws SyncException {
		try {
			client.writeDocument(
				"metadata",
				"metadata.json",
				accountId,
				metadata
			);
		} catch (NerdgraphQueryException e) {
			throw new SyncException(
				"failed to write metadata for account ID " + accountId,
				e
			);
		}
	}

	public Manifest readManifest(
		String accountId
	) throws IOException, SyncException {
		File manifestDir = new File(getenv(
			"MANIFEST_DIR",
			"conf"
		));

		if (!manifestDir.exists()) {
			throw new SyncException(
				"manifest directory " + manifestDir + " does not exist"
			);
		}

		LOGGER.finest("loading manifest for account ID " + accountId);

		File manifestFile = new File(
			manifestDir,
			"manifest_" + accountId + ".json"
		);

		if (!manifestFile.exists()) {
			LOGGER.finest("no manifest found for account ID " + accountId);
			return new Manifest();
		}

		String data = Files.readString(
			manifestFile.toPath(),
			StandardCharsets.UTF_8
		);

		LOGGER.finest("found manifest for account ID " + accountId);
		LOGGER.finest(data);

		return new Gson().fromJson(data, Manifest.class);
	}

	public void writeManifest(
		String accountId,
		Manifest manifest
	) throws IOException, SyncException {
		File manifestDir = new File(getenv(
			"MANIFEST_DIR",
			"conf"
		));

		if (!manifestDir.exists()) {
			throw new SyncException(
				"manifest directory " + manifestDir + " does not exist"
			);
		}

		LOGGER.finest("storing manifest for account ID " + accountId);

		String json = new Gson().toJson(manifest);

		LOGGER.finest(json);

		File manifestFile = new File(
			manifestDir,
			"manifest_" + accountId + ".json"
		);

		Files.writeString(
			manifestFile.toPath(),
			json,
			StandardCharsets.UTF_8
		);
	}

	public void downloadManifest(
		NerdgraphClient client,
		String accountId
	) throws SyncException {
		try {
			ReadDocumentResponse<Manifest> response = client.readDocument(
				"manifests",
				"manifest.json",
				accountId,
				// @see https://github.com/google/gson/blob/main/UserGuide.md#serializing-and-deserializing-generic-types
				new TypeToken<ReadDocumentResponse<Manifest>>() {}.getType()
			);
			Manifest manifest = response.getDocument();

			if (manifest == null) {
				throw new SyncException(
					"missing manifests/manifest.json in nerdstorage for account ID "
						+ accountId
				);
			}

			writeManifest(accountId, manifest);
		} catch (NerdgraphQueryException e) {
			throw new SyncException(
				"failed to read manifest for account ID " + accountId,
				e
			);
		} catch (IOException e) {
			throw new SyncException(
				"failed to store manifest for account ID " + accountId,
				e
			);
		}
	}

	public String[] getScheduleNames(
		String accountId,
		String scheduleGroupName
	) throws SyncException {
		try {
			Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();
			Set<JobKey> jobKeys;

			jobKeys = scheduler.getJobKeys(
				GroupMatcher.groupEquals(scheduleGroupName)
			);

			List<String> scheduleNames = new ArrayList<>();

			for (JobKey key : jobKeys) {
				String name = key.getName();

				if (!name.startsWith(accountId + ".")) {
					continue;
				}

				scheduleNames.add(name);
			}

			String[] arr = new String[scheduleNames.size()];
			return scheduleNames.toArray(arr);
		} catch (SchedulerException e) {
			throw new SyncException(
				"failed to get job keys from scheduler",
				e
			);
		}
	}

	public PublishConfigItem[] getPublishConfigurationItems(
		String accountId,
		Report[] reports
	) {
		if (reports == null || reports.length == 0) {
			return new PublishConfigItem[0];
		}

		List<PublishConfigItem> publishConfigItems = new ArrayList<>();

		for (Report r : reports) {
			String reportId = r.getId();
			String reportName = getReportName(r);
			PublishConfig[] publishConfigs = r.getPublishConfigs();

			if (publishConfigs == null) {
				LOGGER.warning(String.format(
					"report %s has no publishConfigs",
					reportName
				));
				continue;
			}

			for (int index = 0; index < publishConfigs.length; index += 1) {
				PublishConfig publishConfig = publishConfigs[index];

				if (publishConfig.getId() == null) {
					LOGGER.warning(String.format(
						"ignoring publish configuration with index %d for report %s because it does not have an 'id' property",
						index,
						reportName
					));
					continue;
				}

				String schedule = getTrimmed(publishConfig.getSchedule());

				if (schedule == null || schedule.isEmpty()) {
					LOGGER.warning(String.format(
						"ignoring publish configuration with id %s for report %s because it has a missing or empty 'schedule' property",
						publishConfig.getId(),
						reportName
					));
					continue;
				}

				publishConfigItems.add(new PublishConfigItem(
					String.format(
						"%s.%s.%s",
						accountId,
						reportId,
						publishConfig.getId()
					),
					r,
					publishConfig.getId(),
					schedule,
					publishConfig.isEnabled()
				));
			}
		}

		PublishConfigItem[] arr =
			new PublishConfigItem[publishConfigItems.size()];

		return publishConfigItems.toArray(arr);
	}

	public int findPublishConfigurationItemByScheduleName(
		List<PublishConfigItem> publishConfigItems,
		String scheduleName
	) {
		for (int index = 0; index < publishConfigItems.size(); index += 1) {
			PublishConfigItem publishConfigItem = publishConfigItems.get(index);

			if (publishConfigItem.getScheduleName().equals(scheduleName)) {
				return index;
			}
		}

		return -1;
	}

	public String scheduleExpressionFromCronExpression(
		Report report,
		PublishConfigItem publishConfigItem
	) throws SyncException {
  		String reportName = getReportName(report);
		String schedule = publishConfigItem.getSchedule();
		List<String> parts = new LinkedList<>(
			Arrays.asList(schedule.trim().split("\\s+"))
		);
		int size = parts.size();

		if (size == 5) {
			// Push a year field if it's only a 5 field expression
			parts.add("0");
		} else if (size != 6) {
			throw new SyncException(
				String.format(
					"invalid cron expression \"%s\" for report \"%s\": Expected 6 parts in CRON expression but found %d.",
					schedule,
					reportName,
					size
				)
			);
		}

		if (!parts.get(2).equals("?") && !parts.get(4).equals("?")) {
			throw new SyncException(
				String.format(
					"invalid cron expression \"%s\" for report \"%s\": Day of month and day of week cannot both be specified.",
					schedule,
					reportName
				)
			);
		}

		// Java Quartz wants a seconds field
		parts.add(0, "0");

		return String.join(" ", parts);
	}

	public boolean isPublishConfigurationEnabled(
		PublishConfigItem publishConfigItem
	) {
		Report r = publishConfigItem.getReport();

		return r.isEnabled() && publishConfigItem.isEnabled();
	}

	public void scheduleJob(
		String accountId,
		String scheduleGroupName,
		PublishConfigItem publishConfigItem
	) throws SyncException {
		try {
			Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();

			JobDetail job = newJob(RunReportJob.class)
				.withIdentity(
					publishConfigItem.getScheduleName(),
					scheduleGroupName
				)
				.usingJobData("accountId", accountId)
				.usingJobData(
					"reportId",
					publishConfigItem.getReport().getId()
				)
				.usingJobData(
					"publishConfigId",
					publishConfigItem.getPublishConfigId()
				)
				.build();

			CronTrigger trigger = newTrigger()
				.withIdentity(
					publishConfigItem.getScheduleName() + "_trigger",
					scheduleGroupName
				)
				.withSchedule(
					cronSchedule(scheduleExpressionFromCronExpression(
						publishConfigItem.getReport(),
						publishConfigItem
					))
						.withMisfireHandlingInstructionDoNothing()
				)
				.build();

			if (LOGGER.isLoggable(Level.FINEST)) {
				LOGGER.finest(String.format(
					"scheduling job for publish config %s for report %s for account %s",
					publishConfigItem.getPublishConfigId(),
					publishConfigItem.getReport().getId(),
					accountId
				));
			}

			scheduler.scheduleJob(job, trigger);

			boolean enabled = isPublishConfigurationEnabled(publishConfigItem);

			if (!enabled) {
				if (LOGGER.isLoggable(Level.FINEST)) {
					LOGGER.finest(String.format(
						"pausing schedule for publish config %s for report %s for account %s",
						publishConfigItem.getPublishConfigId(),
						publishConfigItem.getReport().getId(),
						accountId
					));
				}

				scheduler.pauseTrigger(
					new TriggerKey(
						publishConfigItem.getScheduleName() + "_trigger",
						scheduleGroupName
					)
				);
			}
		} catch (SchedulerException e) {
			throw new SyncException(
				String.format(
					"failed to schedule job for publish config %s for report %s for account %s",
					publishConfigItem.getPublishConfigId(),
					publishConfigItem.getReport().getId(),
					accountId
				),
				e
			);
		}
	}

	public void createSchedules(
		String accountId,
		String scheduleGroupName,
		List<PublishConfigItem> schedulesToCreate
	) throws SyncException {
		for (PublishConfigItem publishConfigItem : schedulesToCreate) {
			if (LOGGER.isLoggable(Level.FINEST)) {
				LOGGER.finest(String.format(
					"creating schedule for publish config %s for report %s for account %s on schedule %s",
					publishConfigItem.getPublishConfigId(),
					publishConfigItem.getReport().getId(),
					accountId,
					publishConfigItem.getSchedule()
				));
			}

			scheduleJob(
				accountId,
				scheduleGroupName,
				publishConfigItem
			);
		}
	}

	public void updateSchedules(
		String accountId,
		String scheduleGroupName,
		List<PublishConfigItem> schedulesToUpdate
	) throws SyncException {
		try {
			Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();

			for (PublishConfigItem publishConfigItem : schedulesToUpdate) {
				TriggerKey key = new TriggerKey(
					publishConfigItem.getScheduleName() + "_trigger",
					scheduleGroupName
				);
				CronTrigger trigger = (CronTrigger)scheduler.getTrigger(key);

				if (trigger == null) {
					LOGGER.finest(String.format(
						"no trigger found for job for publish config %s for report %s for account %s",
						publishConfigItem.getPublishConfigId(),
						publishConfigItem.getReport().getId(),
						accountId
					));
					continue;
				}

				String cronExpression = trigger.getCronExpression();
				String schedule = scheduleExpressionFromCronExpression(
					publishConfigItem.getReport(),
					publishConfigItem
				);

				if (LOGGER.isLoggable(Level.FINEST)) {
					LOGGER.finest(String.format(
						"trigger schedule: \"%s\"; publishConfig schedule:\"%s\"",
						cronExpression,
						schedule
					));
				}

				if (!cronExpression.equals(schedule)) {
					if (LOGGER.isLoggable(Level.FINEST)) {
						LOGGER.finest(String.format(
							"updating schedule for publish config %s for report %s for account %s on schedule %s",
							publishConfigItem.getPublishConfigId(),
							publishConfigItem.getReport().getId(),
							accountId,
							publishConfigItem.getSchedule()
						));
					}

					scheduler.deleteJob(
						new JobKey(
							publishConfigItem.getScheduleName(),
							scheduleGroupName
						)
					);

					scheduleJob(
						accountId,
						scheduleGroupName,
						publishConfigItem
					);

					continue;
				}

				Trigger.TriggerState state = scheduler.getTriggerState(
					trigger.getKey()
				);
				boolean isEnabled = isPublishConfigurationEnabled(publishConfigItem);

				if (LOGGER.isLoggable(Level.FINEST)) {
					LOGGER.finest(String.format(
						"trigger state: \"%s\"; publishConfig enabled:\"%s\"",
						state,
						isEnabled
					));
				}

				if (!isEnabled && state == Trigger.TriggerState.NORMAL) {
					if (LOGGER.isLoggable(Level.FINEST)) {
						LOGGER.finest(String.format(
							"pausing schedule for publish config %s for report %s for account %s",
							publishConfigItem.getPublishConfigId(),
							publishConfigItem.getReport().getId(),
							accountId
						));
					}

					scheduler.pauseTrigger(key);
					continue;
				}

				if (isEnabled && state == Trigger.TriggerState.PAUSED) {
					if (LOGGER.isLoggable(Level.FINEST)) {
						LOGGER.finest(String.format(
							"resuming schedule for publish config %s for report %s for account %s",
							publishConfigItem.getPublishConfigId(),
							publishConfigItem.getReport().getId(),
							accountId
						));
					}

					scheduler.resumeTrigger(key);
					continue;
				}

				if (LOGGER.isLoggable(Level.FINEST)) {
					LOGGER.finest(String.format(
						"ignoring update for publish config %s for report %s for account %s because nothing changed",
						publishConfigItem.getPublishConfigId(),
						publishConfigItem.getReport().getId(),
						accountId
					));
				}
			}
		} catch (SchedulerException e) {
			throw new SyncException(
				"update schedules failed",
				e
			);
		}
	}

	public void deleteSchedules(
		String scheduleGroupName,
		List<String> schedulesToDelete
	) throws SyncException {
		try {
			Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();

			for (String scheduleName : schedulesToDelete) {
				LOGGER.finest("deleting schedule " + scheduleName);

				scheduler.deleteJob(
					new JobKey(scheduleName, scheduleGroupName)
				);
			}
		} catch (SchedulerException e) {
			throw new SyncException(
				"delete schedules failed",
				e
			);
		}
	}

	public void applyChangeSet(
		String accountId,
		String scheduleGroupName,
		List<PublishConfigItem> schedulesToCreate,
		List<PublishConfigItem> schedulesToUpdate,
		List<String> schedulesToDelete
	) throws SyncException {
		if (LOGGER.isLoggable(Level.FINEST)) {
			LOGGER.finest(
				"schedules to create: " + schedulesToCreate.size()
			);
			LOGGER.finest(
				"schedules to update: " + schedulesToUpdate.size()
			);
			LOGGER.finest(
				"schedules to delete: " + schedulesToDelete.size()
			);
		}

		if (!schedulesToCreate.isEmpty()) {
			createSchedules(accountId, scheduleGroupName, schedulesToCreate);
		}

		if (!schedulesToUpdate.isEmpty()) {
			updateSchedules(accountId, scheduleGroupName, schedulesToUpdate);
		}

		if (!schedulesToDelete.isEmpty()) {
			deleteSchedules(scheduleGroupName, schedulesToDelete);
		}
	}

	public void calculateAndApplyChangeSet(
		String accountId,
		String scheduleGroupName,
		long lastPolledDate,
		String[] scheduleNames,
		PublishConfigItem[] publishConfigItems
	) throws SyncException {
		List<PublishConfigItem> p = new LinkedList<>(
			Arrays.asList(publishConfigItems)
		);
		List<PublishConfigItem> schedulesToCreate = new LinkedList<>();
		List<String> schedulesToDelete = new LinkedList<>();
		List<PublishConfigItem> schedulesToUpdate = new LinkedList<>();

		LOGGER.finest(
			"processing " + scheduleNames.length + " schedules"
		);

		if (p.isEmpty()) {
			LOGGER.finest("no publish configuration items to process");

			if (scheduleNames.length > 0) {
				schedulesToDelete.addAll(Arrays.asList(scheduleNames));
			}
		} else {
			LOGGER.finest(
				"publish configuration items to process: " + p.size()
			);

			for (String scheduleName : scheduleNames) {
				LOGGER.finest(
					"searching for a publish configuration item matching schedule " +
						scheduleName
				);

				int index = findPublishConfigurationItemByScheduleName(
					p,
					scheduleName
				);

				if (index >= 0) {
					PublishConfigItem publishConfigItem = p.remove(index);
					Report report = publishConfigItem.getReport();
					String reportName = getReportName(report);

					if (LOGGER.isLoggable(Level.FINEST)) {
						LOGGER.finest(String.format(
							"publish configuration item for publish configuration %s for report %s matches schedule %s",
							publishConfigItem.getPublishConfigId(),
							reportName,
							scheduleName
						));
						LOGGER.finest(String.format(
							"report last modified: %s; last polled: %s",
							toIsoString(report.getLastModifiedDate()),
							toIsoString(lastPolledDate)
						));
					}

					if (report.getLastModifiedDate() < lastPolledDate) {
						// report wasn't modified, ignore it
						if (LOGGER.isLoggable(Level.FINEST)) {
							LOGGER.finest(String.format(
								"ignoring publish configuration item for publish configuration %s for report %s because report has not changed since last polled date",
								publishConfigItem.getPublishConfigId(),
								reportName
							));
						}
						continue;
					}

					if (LOGGER.isLoggable(Level.FINEST)) {
						LOGGER.finest(String.format(
							"adding publish configuration item for publish configuration %s for report %s to update list",
							publishConfigItem.getPublishConfigId(),
							reportName
						));
					}

					schedulesToUpdate.add(publishConfigItem);
					continue;
				}

				if (LOGGER.isLoggable(Level.FINEST)) {
					LOGGER.finest(String.format(
						"adding schedule %s to delete list because no matching publish configuration items were found",
						scheduleName
					));
				}

				schedulesToDelete.add(scheduleName);
			}

			if (LOGGER.isLoggable(Level.FINEST)) {
				for (PublishConfigItem publishConfigItem : p) {
					Report report = publishConfigItem.getReport();
					String reportName = getReportName(report);

					LOGGER.finest(String.format(
						"adding publish configuration item for publish configuration %s for report %s to create list",
						publishConfigItem.getPublishConfigId(),
						reportName
					));
				}
			}

			schedulesToCreate.addAll(p);
		}

		applyChangeSet(
			accountId,
			scheduleGroupName,
			schedulesToCreate,
			schedulesToUpdate,
			schedulesToDelete
		);
	}

	public void hup(
		String accountId,
		long lastPolledDate,
		String scheduleGroupName
	) throws SyncException, IOException {
		Manifest manifest = readManifest(accountId);
		String[] scheduleNames = getScheduleNames(accountId, scheduleGroupName);
		PublishConfigItem[] publishConfigItems = getPublishConfigurationItems(
			accountId,
			manifest.getReports()
		);

		calculateAndApplyChangeSet(
			accountId,
			scheduleGroupName,
			lastPolledDate,
			scheduleNames,
			publishConfigItems
		);
	}
}
