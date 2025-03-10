package com.newrelic.labs.reports;

import com.google.gson.Gson;
import org.apache.hc.client5.http.async.methods.SimpleHttpRequest;
import org.apache.hc.client5.http.async.methods.SimpleHttpResponse;
import org.apache.hc.client5.http.async.methods.SimpleRequestBuilder;
import org.apache.hc.client5.http.async.methods.SimpleRequestProducer;
import org.apache.hc.client5.http.async.methods.SimpleResponseConsumer;
import org.apache.hc.client5.http.impl.async.CloseableHttpAsyncClient;
import org.apache.hc.client5.http.impl.async.HttpAsyncClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.io.CloseMode;
import org.apache.hc.core5.reactor.IOReactorConfig;
import org.apache.hc.core5.util.Timeout;

import java.lang.reflect.Type;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.logging.Level;
import java.util.logging.Logger;

public class NerdgraphClient {
	private static final Logger LOGGER =
		Logger.getLogger(NerdgraphClient.class.getName());

	private final String endpointUrl;
	private final String apiKey;
	private final String nerdletPackageId;
	private final Util util;

	public NerdgraphClient(
		Util util,
		String endpointUrl,
		String apiKey,
		String nerdletPackageId
	) {
		this.util = util;
		this.endpointUrl = endpointUrl;
		this.apiKey = apiKey;
		this.nerdletPackageId = nerdletPackageId;
	}

	public <T> void writeDocument(
		String collectionName,
		String documentId,
		String accountId,
		T document
	) throws NerdgraphQueryException {
		String json = this.util.escapeQuotes(new Gson().toJson(document));
		String payload = String.format("""
{
	"query": "mutation($accountId: String!,$documentId: String!,$collectionId: String!,$document: NerdStorageDocument!){nerdStorageWriteDocument(collection: $collectionId,document: $document,documentId: $documentId,scope: {id: $accountId, name: ACCOUNT},scopeByActor: false)}",
	"variables": {
		"accountId": "%s",
		"documentId": "%s",
		"collectionId": "%s",
		"document": "%s"
	}
}
		""", accountId, documentId, collectionName, json);

		final IOReactorConfig ioReactorConfig = IOReactorConfig.custom()
			.setSoTimeout(Timeout.ofSeconds(5))
			.build();

		final CloseableHttpAsyncClient client = HttpAsyncClients.custom()
			.setIOReactorConfig(ioReactorConfig)
			.build();

		client.start();

		final SimpleHttpRequest request = SimpleRequestBuilder.post()
			.setUri(this.endpointUrl)
			.setBody(payload, ContentType.APPLICATION_JSON)
			.addHeader("Content-Type", "application/json")
			.addHeader("Accept", "application/json")
			.addHeader("Accept-Charset", "utf-8")
			.addHeader("API-Key", this.apiKey)
			.addHeader("newrelic-package-id", this.nerdletPackageId)
			.build();

		if (LOGGER.isLoggable(Level.FINEST)) {
			LOGGER.finest(String.format(
				"posting GraphQL for writing document %s in collection %s for account %s and nerdlet %s",
				documentId,
				collectionName,
				accountId,
				this.nerdletPackageId
			));
			LOGGER.finest(payload);
		}

		final Future<SimpleHttpResponse> future = client.execute(
			SimpleRequestProducer.create(request),
			SimpleResponseConsumer.create(),
			null
		);

		try {
			SimpleHttpResponse resp = future.get();
			int httpCode = resp.getCode();
			String reasonPhrase = resp.getReasonPhrase();
			String body = resp.getBodyText();

			if (LOGGER.isLoggable(Level.FINEST)) {
				LOGGER.finest(String.format(
					"reason code: %d; reason phrase: %s",
					httpCode,
					reasonPhrase
				));
				LOGGER.finest(body);
			}

			if (httpCode < 200 || httpCode > 299) {
				throw new NerdgraphQueryException(String.format(
					"invalid response code on nerdgraph query: %d \"%s\"",
					httpCode,
					reasonPhrase
				));
			}
		} catch (InterruptedException e) {
			throw new NerdgraphQueryException(
				"write document query was interrupted",
				e
			);
		} catch (ExecutionException e) {
			throw new NerdgraphQueryException(
				"write document query failed",
				e
			);
		} finally {
			client.close(CloseMode.GRACEFUL);
		}
	}

	public <T> T readDocument(
		String collectionName,
		String documentId,
		String accountId,
		Type t
	) throws NerdgraphQueryException {
		String payload = String.format("""
{
  "query": "query($accountId: Int!,$documentId: String!,$collectionId: String!){actor{account(id: $accountId){nerdStorage{document(documentId: $documentId, collection: $collectionId)}}}}",
  "variables": {
  	"accountId": %s,
  	"documentId": "%s",
  	"collectionId": "%s"
  }
}
			""", accountId, documentId, collectionName);

		final IOReactorConfig ioReactorConfig = IOReactorConfig.custom()
			.setSoTimeout(Timeout.ofSeconds(5))
			.build();

		final CloseableHttpAsyncClient client = HttpAsyncClients.custom()
			.setIOReactorConfig(ioReactorConfig)
			.build();

		client.start();

		final SimpleHttpRequest request = SimpleRequestBuilder.post()
			.setUri(this.endpointUrl)
			.setBody(payload, ContentType.APPLICATION_JSON)
			.addHeader("Content-Type", "application/json")
			.addHeader("Accept", "application/json")
			.addHeader("Accept-Charset", "utf-8")
			.addHeader("API-Key", this.apiKey)
			.addHeader("newrelic-package-id", this.nerdletPackageId)
			.build();

		if (LOGGER.isLoggable(Level.FINEST)) {
			LOGGER.finest(String.format(
				"posting GraphQL for reading document %s in collection %s for account %s and nerdlet %s",
				documentId,
				collectionName,
				accountId,
				this.nerdletPackageId
			));
			LOGGER.finest(payload);
		}

		final Future<SimpleHttpResponse> future = client.execute(
			SimpleRequestProducer.create(request),
			SimpleResponseConsumer.create(),
			null
		);

		try {
			SimpleHttpResponse resp = future.get();
			int httpCode = resp.getCode();
			String reasonPhrase = resp.getReasonPhrase();
			String body = resp.getBodyText();

			if (LOGGER.isLoggable(Level.FINEST)) {
				LOGGER.finest(String.format(
					"reason code: %d; reason phrase: %s",
					httpCode,
					reasonPhrase
				));
				LOGGER.finest(body);
			}

			if (httpCode < 200 || httpCode > 299) {
				throw new NerdgraphQueryException(String.format(
					"invalid response code on nerdgraph query: %d \"%s\"",
					httpCode,
					reasonPhrase
				));
			}

			return new Gson().fromJson(body, t);
		} catch (InterruptedException e) {
			throw new NerdgraphQueryException(
				"read document query was interrupted",
				e
			);
		} catch (ExecutionException e) {
			throw new NerdgraphQueryException(
				"read document query failed",
				e
			);
		} finally {
			client.close(CloseMode.GRACEFUL);
		}
	}
}
