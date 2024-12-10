// init class with id of user
import { Browser, BrowserContext, chromium, Page } from "playwright";

class WatchlistScraper {
	userId: string;
	idArr: Array<string>;
	currentPage!: Page;
	browserContext!: BrowserContext;
	browser!: Browser;
	timeoutInMs: number;
	constructor(userId: string, timeoutInMs = 180000) {
		this.userId = userId;
		this.idArr = [];
		this.timeoutInMs = timeoutInMs;
	}

	async openBrowserAndBlankPage() {
		const browser = await chromium.launch({ headless: false });
		const context = await browser.newContext({
			userAgent:
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		});
		const page = await context.newPage();

		this.currentPage = page;
		this.browserContext = context;
		this.browser = browser;
	}

	async closeScraper() {
		await this.browserContext.close();
		await this.browser.close();
	}

	// Resolves once it hits a request that has idArray in it
	async pageListenToGraphQlRequests() {
		return new Promise<void>((resolve) => {
			this.currentPage.on("request", async (request) => {
				if (
					request.method() !== "POST" ||
					request.url() !== "https://api.graphql.imdb.com/"
				) {
					return;
				}

				const requestIdArr = await request.postDataJSON().variables.idArray;
				if (!Array.isArray(requestIdArr) || !requestIdArr.length) {
					return;
				}

				this.idArr.push(...requestIdArr);

				let idArrLength = requestIdArr.length;
				// 250 is the maximum count rendered without scrolling
				if (idArrLength < 250) {
					resolve();
					return;
				}

				// Scroll to last element to load
				const lastElementIndex = this.idArr.length;
				const lastElementLocator = this.currentPage.getByRole("link", {
					name: `^${lastElementIndex}\..*`,
				});
				while (!(await lastElementLocator.isVisible())) {
					this.currentPage.keyboard.press("End");
				}
				this.currentPage.keyboard.press("End");
				return;
			});
		});
	}

	timeoutPromise() {
		return new Promise<void>((resolve, reject) => {
			setTimeout(() => {
				reject(
					"Timed out while waiting for . (Timeout length may need to be increased)"
				);
			}, this.timeoutInMs);
		});
	}

	async watchlistGrabFirstIdBatch(isGrabAll: boolean) {
		await this.openBrowserAndBlankPage();

		const postRequestListenerPromise = this.pageListenToGraphQlRequests();
		await this.currentPage.goto(
			`https://www.imdb.com/user/${this.userId}/ratings/`
		);

		try {
			await Promise.race([postRequestListenerPromise, this.timeoutPromise()]);
		} catch (error) {
			console.error(error);
		}

		this.closeScraper();
		return;
	}
}
