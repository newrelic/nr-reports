package com.newrelic.labs.reports.model;

public class ReadDocumentResponse<T> {

	static class NerdStorage<T> {
		T document;
	}

	static class Account<T> {
		NerdStorage<T> nerdStorage;
	}

	static class Actor<T> {
		Account<T> account;
	}
	static class Data<T> {
		Actor<T> actor;
	}

	@SuppressWarnings("unused")
	private Data<T> data;

	ReadDocumentResponse() {}

	public T getDocument() {
		if (this.data == null) {
			return null;
		}

		if (this.data.actor == null) {
			return null;
		}

		if (this.data.actor.account == null) {
			return null;
		}

		if (this.data.actor.account.nerdStorage == null) {
			return null;
		}

		return this.data.actor.account.nerdStorage.document;
	}
}
