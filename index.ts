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
		userAgent: string;
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

		await page.route("**/*", (route, request) => {
			if (["image", "media", "stylesheet"].includes(request.resourceType())) {
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

					// Scroll to last element to load
					const lastElementIndex = this.idArr.length;
					const lastElementLocator = this.currentPage.getByRole("link", {
						name: new RegExp(`^${lastElementIndex}\..*`),
					});

					while (!(await lastElementLocator.isVisible())) {
						await this.currentPage.keyboard.press("End");
						await lastElementLocator.scrollIntoViewIfNeeded();
					}

					return;
				} catch (error) {
					console.error(error);
				}
			});
		});
	}

	timeoutPromise() {
		return new Promise<void>((resolve, reject) => {
			setTimeout(() => {
				reject(
					"Timed out while waiting for first POST request or while scrolling to next batch of IDs. (Timeout length may need to be increased)"
				);
			}, this.timeoutInMs);
		});
	}

	async watchlistGrabIds() {
		await this.openBrowserAndBlankPage();

		const postRequestListenerPromise = this.pageListenToGraphQlRequests();
		await this.currentPage.goto(
			`https://www.imdb.com/user/${this.userId}/ratings/`
		);

		const usernameLocator = this.currentPage.getByTestId("list-author-link");
		this.username = (await usernameLocator.isVisible())
			? await usernameLocator.innerText()
			: null;

		try {
			await Promise.race([postRequestListenerPromise, this.timeoutPromise()]);
		} catch (error) {
			console.error(error);
			this.closeScraper();
			return null;
		}

		this.closeScraper();
		if (Array.isArray(this.idArr) && this.idArr.length) {
			return { idArr: this.idArr, username: this.username };
		} else {
			console.error("No IDs found, try again");
			return null;
		}
	}
}

export { WatchlistScraper };
