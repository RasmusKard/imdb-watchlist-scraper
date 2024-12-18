// init class with id of user
import { Browser, BrowserContext, chromium, Page } from "playwright";

class WatchlistScraper {
	userId: string;
	idArr: Array<string>;
	currentPage!: Page;
	browserContext!: BrowserContext;
	browser!: Browser;
	timeoutInMs: number;
	username!: string | null;
	headless: boolean;
	userAgent: string;

	constructor({
		userId,
		timeoutInMs = 180000,
		headless = true,
		userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	}: {
		userId: string;
		timeoutInMs?: number;
		headless?: boolean;
		userAgent?: string;
	}) {
		this.userId = this.userIdSanitizer(userId);
		this.idArr = [];
		this.headless = headless;
		this.timeoutInMs = timeoutInMs;
		this.userAgent = userAgent;
	}

	userIdSanitizer(userId: string) {
		return userId.replace(/[^a-zA-Z0-9]/g, "");
	}

	async openBrowserAndBlankPage() {
		const browser = await chromium.launch({ headless: this.headless });
		const context = await browser.newContext({
			userAgent: this.userAgent,
		});
		const page = await context.newPage();

		const imdbMetricsUrlRegex = /.*imdb\.com\/api\/_ajax\/metrics.*/;
		await page.route("**/*", (route, request) => {
			if (["image", "media", "stylesheet"].includes(request.resourceType())) {
				route.abort();
			} else if (imdbMetricsUrlRegex.test(request.url())) {
				// abort if tries to send request to imdb metrics
				route.abort();
			} else {
				route.continue();
			}
		});

		this.currentPage = page;
		this.browserContext = context;
		this.browser = browser;
	}

	async closeScraper() {
		await this.currentPage.close();
		await this.browserContext.close();
		await this.browser.close();
	}

	// Resolves once it hits a request that has idArray in it
	async pageListenToGraphQlRequests() {
		return new Promise<void>((resolve) => {
			this.currentPage.on("request", async (request) => {
				try {
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

					const lastElementIndex = this.idArr.length;
					const lastElementLocator = this.currentPage.getByRole("link", {
						name: new RegExp(`^${lastElementIndex}\..*`),
					});

					// navigate to the end of the page while the last element of currently rendered content isn't visible
					// once it is scroll it into center of view
					while (!(await lastElementLocator.isVisible())) {
						await this.currentPage.keyboard.press("End");
					}
					await lastElementLocator.scrollIntoViewIfNeeded();

					return;
				} catch (error) {
					console.error(error);
				}
			});
		});
	}

	async watchlistGrabIds() {
		let timeoutID;
		const timeoutPromise = new Promise((_, reject) => {
			timeoutID = setTimeout(() => {
				reject(
					new Error(
						"Timed out while waiting for first POST request or while scrolling to next batch of IDs. (Timeout length may need to be increased)"
					)
				);
			}, this.timeoutInMs);
		});

		await this.openBrowserAndBlankPage();

		const postRequestListenerPromise = this.pageListenToGraphQlRequests();
		await this.currentPage.goto(
			`https://www.imdb.com/user/${this.userId}/ratings/`
		);

		// Handle privated list
		const privateTextA = this.currentPage.getByText("Private list");
		const privateTextB = this.currentPage.getByText(
			"The creator of this list has"
		);
		if ((await privateTextA.isVisible()) && (await privateTextB.isVisible())) {
			this.closeScraper();
			throw new Error("Watchlist is set to private");
		}

		const usernameLocator = this.currentPage.getByTestId("list-author-link");
		this.username = (await usernameLocator.isVisible())
			? await usernameLocator.innerText()
			: null;

		try {
			await Promise.race([postRequestListenerPromise, timeoutPromise]);
			clearTimeout(timeoutID);
		} catch (error) {
			clearTimeout(timeoutID);
			throw error;
		}

		this.closeScraper();

		if (Array.isArray(this.idArr) && this.idArr.length) {
			return { idArr: this.idArr, username: this.username };
		} else {
			throw new Error("Unknown error ocurred: no IDs found");
		}
	}
}

export { WatchlistScraper };
