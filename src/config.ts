import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Nexty",
	subtitle: "大地从不喧哗，但她孕育万物。仅以我的视角，留下一些真实的痕迹。",
	url: "https://nexty.cc",
	lang: "zh_CN",
	themeColor: {
		hue: 250,
		fixed: false,
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [],
};

export const navBarConfig: NavBarConfig = {
	links: [
		{ name: "原野", labelCn: "原野", labelEn: "WILD", url: "/" },
		{ name: "微光", labelCn: "微光", labelEn: "GLOW", url: "/posts/" },
		{ name: "留影", labelCn: "留影", labelEn: "FRAME", url: "/gallery/" },
		{ name: "土壤", labelCn: "土壤", labelEn: "EARTH", url: "/about/" },
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.jpg",
	name: "Ytx",
	bio: "大地从不喧哗，但她孕育万物。",
	links: [
		{
			name: "X",
			icon: "fa6-brands:x-twitter",
			url: "https://x.com/",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};