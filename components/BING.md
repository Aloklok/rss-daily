Bing Webmaster Guidelines
These guidelines are intended to help you understand how Bing finds, indexes, and ranks websites.

Following these guidelines will help with indexing of your site on Bing. It will also help you optimize your site to increase its opportunity to rank for relevant queries in Bing’s search results. Please pay special attention to the guidance in the “Abuse section” and examples in the “Things to avoid” section. Following the guidelines will ensure your site plays by the rules and is not found to be spammy, which could lead to demotion or even delisting your website from Bing search results.

How Bing finds and indexes your site
Help Bing find all your pages
Sitemaps: Sitemaps are an essential way for Bing to discover URLs and content for your website. It is a file that provides information about the URLs, other files, and content such as images and videos on your website. The sitemap informs the crawler about pages and files you believe are important within your site. It also provides additional information, such as when the page was last updated. We strongly recommend using an XML sitemap file to help Bing discover all the relevant URLs and content within your website. Please keep your sitemap files as up-to-date as possible; refreshing them in real-time or at least once a day. This will enable the timely removal of old URLs and deadlinks once the content is removed from your website.

Make your sitemap available to Bing by:
Submitting it to Bing using the Bing Webmaster Tools Sitemap tool
Inserting the following line in the robots.txt file, specifying the path to your sitemap:
Sitemap: http://example.com/sitemap_location.xml
Once Bing knows your sitemap, Bing will crawl it regularly. There is no need to submit it again except in case of significant changes on the site.

General sitemap guidelines:
Bing supports several sitemap formats including XML, RSS, MRSS, Atom 1.0, and a text file.
Use consistent URLs. Bing will only crawl the URLs precisely as listed.
Please only list canonical URLs in your sitemaps.
If your website has multiple versions (HTTP vs HTTPS, or mobile vs desktop), we recommend only pointing to a single version in your sitemap. If you decide to have a unique URL experience for mobile vs desktop, please annotate with the rel="alternate" attribute.
If you have multiple pages for different languages or regions, please use the hreflang tags in either the sitemap or the HTML tag to identify the alternate URLs.
Use the <lastmod> attribute to indicate the date and time when the content was last modified.
The maximum sitemap size is 50,000 URLs/50MB uncompressed. If your site is large, consider breaking up large sitemaps into smaller sitemaps and, then use a sitemap index file to list all individual sitemaps.
Refer to your sitemap in the robots.txt file.
If you have not changed your sitemap since Bing crawled it there is no need or benefit to resubmitting it.

Using a sitemap does not guarantee that all items within a sitemap will be crawled and indexed; however, in most cases you will benefit by having a sitemap as it provides a recommendation and guidance to the crawler.

Use IndexNow API or the Bing URL or Content Submission API to instantly reflect website changes. If you are unable to adopt the APIs, we recommend submitting the updated URLs directly through Bing Webmaster Tools or by including them in your sitemap.

Links: Links are traditionally regarded as a signal for determining website popularity. The best way to get other sites to link to your site is to create unique and high quality and unique content. Bing’s crawler (Bingbot) follows links within your website (internal links) or from other sites (external links) to help Bing discover new content and new pages.

Bing recommends linking all pages on a site to at least one other discoverable and crawlable page.
Crawlable links are <a> tags with an href attribute. The referring link should include either a text or an image alt attribute that is relevant to the page.
Limit the number of links on a page to a reasonable quantity, no more than a few thousand links per page.
Make a reasonable effort to ensure that any paid or advertisement links on your site use rel="nofollow" or rel="sponsored" or rel="ugc" attribute to prevent the links from being followed by a crawler and from potentially impacting search rankings.
Bing rewards links that have grown organically; links added over time by content creators on other trusted, relevant websites that drive real users from their site to yours. Plan to build links both internally and externally, in an organic manner.

Abusive tactics that aim to inflate the number and nature of inbound links, such as links buying participating in link schemes (link farms, link spamming and excessive link manipulation) can lead to your site being penalized and delisted from the Bing index.

Limit the number of web pages: Limit the number of pages on your website to a reasonable number. Avoid duplicative content within your site; help us dedupe duplicate content by:
Avoid outputting different URLs with the same content by using the Canonical Tag.
Configuring your website and URL Parameters to improve crawl efficiency and help reduce multiple variations of the same URL pointing to the same content.
Avoid mobile-specific URLs. Try using the same URL for desktop and mobile users.

Use redirects as appropriate: If you move content on your website to another location, use a HTTP 301 permanent redirect for at least three months. If the move is temporary, i.e. less than one day, use a 302 temporary redirect. Avoid using a rel=canonical tag in place of a proper redirect when site content has moved from one location to another.

Let Bing crawl more: The Webmaster Tool's crawl control feature allows you to manage how Bingbot crawls your content, including when, and at what pace. We encourage Webmasters to enable Bingbot to quickly and deeply crawl sites to ensure as much content as possible is discovered and indexed.

JavaScript:Bingcan process JavaScript, however, there are limitations to processing JavaScript at scale while minimizing the number of HTTP requests. Bing recommends Dynamic Rendering to switch between client-side rendered and pre-rendered content for specific user agents such as Bingbot, especially large web sites.

Remove content by returning a 404 "Not Found" HTTP code. Expedite content removal by using the Bing Content Removal and Page Removal tools. Content removal requests last for a maximum of 90 days, and you need to renew it, or content may reappear in the search results.

robots.txt: A robots.txt file informs search engine crawlers such as Bingbot, which pages and files the crawler can or cannot access on your site. Robots.txt is primarily used to instruct and manage crawler traffic, For example you can tell Bingbot not to crawl less helpful content such as search result pages or login pages.
Place the robots.txt in your root directory (the topmost directory) of your website. Do not place it in a subdirectory.
Blocking Bing from crawling a page will likely remove the page from the index. However, using Disallow does not guarantee that a page will not appear within the index or search results. If you would like to block a specific page from getting crawled or indexed, you should use the noindex robots meta tag instead of disallowing it in the robots.txt.
Review your robots.txt often to ensure it's up to date. Review URLs disallowed by robots.txt in Bing Webmaster Tools to ensure it remains accurate.
Learn more by reading how to create a robots.txt text file

Save resources: Use HTTP Compression and Conditional Get to reduce bandwidth used by the crawlers and your customers while improving page load speed.
Help Bing understand your pages
Bing seeks rich, valuable, and engaging content created for users, not search engines. By creating clear, unique, high-quality, relevant, and easy-to-find content on your website, you will increase the probability of Bing indexing and showing your content in search results.

Content: Websites that are thin on content, show ads or affiliate links primarily, or redirect visitors away to other sites quickly tend to drop in rankings on Bing. In some cases, it may not get indexed at all. Your content should be easy to navigate, rich and engaging to the website visitor, and provide the information they seek.

Create content for search users not search engines: Develop rich content based on keyword research that shows what search users the information they are looking for.

Create enough content to meet the visitor’s expectations entirely. There are no hard and fast rules on the number of words per page, but providing more relevant content is usually better..

Make it unique. Do not reuse content from other sources. Content on your page must be unique in its final form. If you choose to host content from a third party, either use the canonical tag (rel="canonical" to identify the original source or use the alternate tag (rel="alternate") .

Images and Videos: Use unique and original images and videos relevant to the topic of the page. Bing can extract information from images, captions, structured data, titles, and related text such as transcripts.
Do not embed important text or information within images or videos. Optical Character Recognition is less reliable than HTML text, and it is not accessible. Alt text improves accessibility for people and devices that cannot see images on pages. When choosing alt text, focus on creating information-rich content that uses keywords appropriately to give context to the image related to the content of the page.
Include descriptive titles, filenames, and text for images and videos.
The videos must be in a supported format and not blocked behind paywall protection or logins.
Subtitles and captions can be used for videos to help make your content available to a broader audience and provide search engines a textual representation of the content in video and audio files.
Choose high-quality photos and videos; they appeal more to users than blurry or out-of-focus images.

Optimize images and videos to improve page load times. Images are often the most significant contributor to page size and slower page loads.
SafeSearch is a setting that specifies whether to show or hide explicit images, videos, and websites in search results. Bing uses machine learning to help categorize images. However the strongest signal is self-marked adult pages and content. We recommend you help Bing understand Adult-Only images and content by:
Using <meta name ="rating" content="adult">
Grouping adult-only images in a common file folder: http://www.example.com/adult/image.png

Make your content discoverable. Avoid housing content inside Flash or JavaScript – these block crawlers from finding content.

Make content accessible and easy to navigate for all site visitors: Test the usability for devices such as screen readers. Listening to your content instead of looking at it can be eye-opening and help you check the accuracy and quality of the alt text for images and videos. Testing for usability can also help identify issues and problems with navigation, reading order, table markup and form elements within your website.
HTML Tags: Ensure your HTML element and alt attributes are descriptive, specific, and accurate.

<TITLE> tags – Title of the page. Write descriptive and unique titles for each page of your website.

<META name="description"> – This is the summary and description of the webpage and may appear as the page description in the search results. Write relevant descriptions; you can use this space to expand on the <title> tag.

<META name="robots"> – You can provide crawling instructions to crawlers on indexing specific page content using these. Using robots meta tag, you can let Bing know about your snippet and content preview preferences.

<a href> tag – specifies the URL linking to another page. If you want to link to another part on the same page use the #tag.

<img src> tag –specifies an image file to be displayed

alt attributes – use this attribute on <img> tags to describe the image. Use descriptive and information-rich context within alt attributes to provide context to the images.

<H1> tag – helps users understand the content of a page more clearly when properly used.

<H1>-<H6> Header tags – Define the structure of your page and helps Bing understand the content of each paragraph.

<P> tag – delineates paragraphs.

<TABLE> tag – Use <TABLE><TH> etc. for data tables. Do not use <TABLE> for layout.

Use HTML5 semantic elements as they have an intrinsic meaning to browser, developer and search engine, especially use the following HTML5 Semantic Elements: <article>, <aside>, <details>, <figcaption>, <figure>, <footer>, <header>, <main>, <mark>, <nav>, <section>, <summary>, <time>.

Verify your HTML via URL Inspection tool or Markup Validation Service.

Microsoft Edge: Make sure your web page does not appear broken in the Microsoft Edge browser. When the document is loaded, searchable content must be visible, and there should be no pop-ups on page load.

Secondary content (CSS, JavaScript): Allow crawlers in your robots.txt. to crawl all your CSS Style Sheet and JavaScript files. Limit usage of dynamic loading of resources – i.e., AJAX to limit the number of HTTP requests and limit the use of JavaScript on large websites.

Use Semantic Markup to convey information about the pages in either Schema.org, RDFa, or OpenGraph. Schema.org is preferred, in either JSON-LD or Microdata format. Note that Semantic Markup may enable Bing's rich features to be triggered. However it does not guarantee it. Verify Schema markup on your pages using URL Inspection.

Abuse and Examples of Things to Avoid
Search Engine Optimization is a legitimate practice that seeks to improve the technical and content aspects of a website, making the content easier to find, relevant, and more accessible to search engine crawlers. Most SEO practices render a website more appealing to Bing; however, performing SEO-related work does not guarantee rankings will improve or sites will receive an increase in traffic from Bing. Further, taken to extremes, some SEO practices can be abused, resulting in penalties by search engines.

These Bing Webmaster Guidelines describe only some of the most widespread forms of inappropriate, manipulative, or misleading behaviors. Sites that engage in abuse, such as the practices outlined below, are considered low quality. As a result, these sites can incur ranking penalties, have site markup ignored, and may not be selected for indexing. Microsoft may take action against your site for any inappropriate or deceptive practices, even those not described here. If you feel action is taken against your site, you can contact our support team through the Bing Webmaster Tools. Additionally, users can report abuse of any of these practices using the feedback link in the footer of bing.com after performing a search that reproduces the issue. An example of this can be seen here.

Abuse Feedback Example
Cloaking: Cloaking is the practice of showing one version of a webpage to a search crawler like Bingbot and another to regular visitors. Showing users different content than what the crawlers see may be seen as a spam tactic and could be detrimental to your website's rankings, leading your site to be de-listed from the Bing index. Websites should be extremely cautious about responding differently to crawlers as opposed to regular visitors and should not use cloaking as a principle.

Link Schemes, Link Buying, Link Spamming: While link schemes may succeed in increasing the number of links pointing to your website, they will fail to bring quality links to your site, netting your site no positive gains. Manipulating inbound links to artificially inflate the number of links pointing to a website can lead to your site being delisted from the Bing index.

Social media schemes: Social media schemes are similar to link farms in that they seek to artificially exploit a network effect to game Bing’s algorithm. The reality is that social media schemes are easy to see in action, and the website’s value is deprecated. One such example is auto follow. Auto follows encourage follower growth on social sites such as Twitter, and work by automatically following anyone who follows you. Over time this creates a scenario where the number of followers you have is more or less the same as the number of people following you. This does not indicate you have a strong influence. Following few people while having a high follower count would indicate a stronger influential voice.

Duplicate content: Duplicating content across multiple URLs can lead to Bing losing trust in some of those URLs over time. This issue should be managed by fixing the root cause of the problem. The rel=canonical element can also be used but should be considered a secondary solution to fixing the core problem. If excessive parameterization is causing the duplicate content issue, we encourage you to use the URL Inspection tool.

Scraped Content: Scraping or copying content from other more reputable websites may not add value to your users and may be considered copyright infringement. Instead of republishing content from other sites without adding any original content or value, you should create original content differentiating your website. Slightly modifying and republishing content from other websites also constitutes scraping.

Keyword Stuffing OR loading pages with irrelevant keywords: When creating content, make sure to create your content for real users and readers, not to entice search engines to rank your content better. Stuffing your content with specific keywords with the sole intent of artificially inflating the probability of ranking for particular search terms is in violation of our guidelines. It can lead to demotion or even delisting your website from our search results.

Automatically generated content: Machine-generated content is information that is generated by an automated computer process, application, or other mechanisms without any active intervention of a human. Content like this is considered malicious and usually contains garbage text only created to garnish a higher ranking. This type of content will result in penalties.

Affiliate programs without adding sufficient value: Websites that link products from other websites (such as Amazon, eBay, etc.) but pretend that they are an official retailer or in affiliation with those sites are called Thin Affiliation sites, and they add little to no incremental value (like extra reviews, search functionality, Editor’s Choice, etc.). and are only intended to take credit for other content. It can lead to demotion or even delisting your website from our search results.

Malicious behavior: When creating content and managing your site, make sure to not participate in phishing or installing viruses, trojans, or other badware by verifying your content, maintaining your Content Management System, keeping your operating system up to date, and limiting access to who can publish on your site. Malicious behavior can lead to demotion or even delisting your website from our search results.

Misleading structured data markup: Site with markups must be accurate and representative of the page that the tags are on. Sites must not have markup which is irrelevant to the page and is inaccurate or misleading.

Prompt injection: Do not add content on your webpages which attempts to perform prompt injection attacks on language models used by Bing. This can lead to demotion or even delisting of your website from our search results.
For information on how Bing ranks your content and on Bing's additional search experiences, please visit our How Bing delivers search results page.

Marking up your site: Overview
At Bing, enabling users to make key decisions through visually appealing, information-rich search results is a key component of our search experience. As a content publisher, you can contribute to – and stand out in – this experience by annotating your structured content using any of the following supported specifications:

Schema.org in the following formats:
HTML Microdata
JSON-LD
Microformats
RDFa
Open Graph
Our crawlers do not prefer one specification over another. It’s entirely up to you to decide which of the supported specifications best fits your data. A basic understanding of web markup is generally sufficient to implement your annotations.

Annotating your data doesn’t actually change the visible content, but gives Bing valuable information on the type of content you’re hosting on your site. On our side, we put your annotations to good use, for example by using them to increase the visual appeal of your search results, or to supplement and validate our data sources.

For example, using address annotations, Bing may display the following search result:

Address annotations
Bing currently supports annotations for the following scenarios:

Scenario

Microdata support

Microformats support

RDFa support

Breadcrumbs

Yes

No

Yes

Businesses and organizations

Yes

Yes (hCard)

Yes

Events

Yes

Yes (hCalendar)

Yes

People

Yes

Yes (hCard)

Yes

Products and offers

Yes

Yes (hProduct)

No

Recipes

Yes

Yes (hRecipe)

Yes

Reviews

Yes

Yes (hReview)

Yes

Reviews (aggregated)

Yes

Yes (hReview-Aggregate)

Yes

ClaimReview (aka Fact Check)

Yes

Yes (itemReviewed)

Yes

noteNote
Bing understands two additional annotation types:

Schema.org, an extension of the traditional Microdata annotations covering a wide variety of data types. Although Schema.org's data types differ from the Microdata data types described on these pages, the annotation techniques described here can be applied to Schema.org annotations.
Page-level annotations as specified by the Open Graph protocol, but currently only uses this information to enhance the visual display of search results of a limited number of publishers.
How Bing News uses Open Graph property: If your site contains the Open Graph property for images, Bing News may display such images at the pixel size you have specified within the Open Graph image meta-tag, for Bing News search results on PC and mobile. For example:

<meta property="og:image" content="https://www.myhost.com/examplenews/example.jpg">

How to stop Bing News from using images at the pixel size specified within the Open Graph image meta-tag: You can add a SOCIALONLY meta-tag to stop the Bing News crawler from displaying such images in Bing News search results on PC and mobile at the pixel size you have specified within the Open Graph image meta-tag. For example:

<meta property="og:image" content="https://www.myhost.com/examplenews/example.jpg" SOCIALONLY>

Things To Keep In Mind
The presence of annotations alone does not guarantee Bing will use your annotated content to generate a visually rich snippet. At all times, we will take the relationship between the annotated content and its surroundings into account.

Once you have implemented your annotations, the Bing crawlers will pick up on them the next time they visit your pages.

In addition to the relevance verification outlined above, a number of reasons may prevent your visually rich search results from appearing on our site:

Schema and Data Validation Failure

Please carefully verify your annotations before publishing them on your site. The Bing crawlers validate your annotated data against the schema specified by the format of your choice as well as against the specified data types. For example, if your price is a date, or vice versa, our crawlers will ignore your annotation.

Similarly, please verify you have provided enough data for the scenario you have selected. An event without a date, or a person without a name, will also be ignored.

Global Availability

Visually rich snippets are currently not supported in every market, although annotations will be processed and validated in every market. This data helps us prioritize markets appropriate as we plan the global roll-out of this feature.

404 Page best practices
A 404 page is a page not found or an error page that appears when a user clicks on a broken link. These pages are often sparsely populated with little content other than a message such as “Page not found”. 404 pages are designed to inform users that the link or resource they clicked on is unavailable or no longer available, and directs visitors to other content in your website.

Few things to keep in mind while building your 404 pages:

No advertising of any kind
All error pages should be free of service calls, such as advertising modules. It means that 404 pages should be static HTML and free from any complex script, advertising or anything that make service calls off the page itself. This is due to the risk of the requested resource not returning in a timely manner, leading to loss of platform integrity (causing a server to crash).
The low volumes these 404 pages experience, combined with the goal of signposting users to other content (in the website) and the goal of acting as an “error” page, means that inserting ads on this page is not beneficial to user experience. It is unlikely to generate significant impression and ultimately drive down overall ad yield and value, due to the low click-through rate this inventory generates.
It includes insertion of automated widgets that can return search results related to the content of the original page. Such widgets can end up getting crawled and create a loop of items served in the search results, and themselves return 404 error pages. This can hurt a search crawler, causing it to avoid your site in future, and can also harm your server.
Page returns a 404 status code
From an SEO perspective, a 404 page should return a 404 Status Code (Page Not Found) as opposed to a 200 (OK) status code. The return of a 404 status code alerts automated users, such as search engine crawlers, about a link that is broken; it is the only way an automated user can ascertain this. If 404 pages return a 200 status code then search engines consider the broken link to be valid, and the “404 page” can end up in the index.
“Smart” 404 pages
As mentioned above, the goal of the 404 pages is two-fold. First to alert visitors that the content is no longer available; and second, to offer other content option(s) to keep the visitor engaged in your website.
It is acceptable to have a 404 page matched to the visual layout of your website as it displays other options which a visitor might click to find related content across your website. Some websites showcase a series of links to their most popular content on the 404 page to keep visitors engaged on the website.
In all cases, make sure that your 404 page is light-weight and loads quickly. Even “smart” 404 pages should avoid external calls to services that populate modules inside the page with data. House the information directly within the page itself.

Special announcement specifications
This article will guide you to include important information related to corona virus spread, like testing facilities, diseaseSpread statistics, travel restrictions, school closures, etc. The schema is based on schema.org.

Examples of topics and markup to be used:

Topic Markup to be used
Changes to your service, such as school closure, business hours, guidelines, etc. SpecialAnnouncement
Government Statistics SpecialAnnouncement / diseaseSpreadStatistics
Testing Facility & Test Information SpecialAnnouncement / CovidTestingFacility & gettingTestedInfo
Travel Restrictions & Guidelines SpecialAnnouncement / publicTransportClosuresInfo & travelBans
Special announcements
When your official website has any special announcements in addition to the above listed, for example if you are changing your services due to the COVID-19 pandemic, you can include a SpecialAnnouncement structured data element on the pages where you display your special announcements. It allows Bing to consider including a notification and link to your announcements page when your customers and community find you on Bing.

When this markup is used it is important that the underlying page:

Contains the name of the special announcement at an easily identifiable and visible location.
Shows up-to-date announcements that are consistent with any web content included in the SpecialAnnouncements element.
Marking it up
The schema.org official site contains additional Special Announcement documentation, including example markups in JSON-LD. The following properties represent the information that we recommend you include as appropriate:

PROPERTY DESCRIPTION
name Required: name of the announcement. This text should be present on the underlying page.
category Required: category of the announcement. Must be from https://www.wikidata.org/wiki/Q81068910 to refer to the COVID-19 outbreak.
datePosted Required: publication date and time of the most recent announcement.
Expires Date when the announcement expires and is no longer useful or available.
Text Text of the announcements. For simple announcements, name, datePosted, and text are enough to describe the announcements.
url URL of the page containing the announcement. If present, this must match the URL of the page containing the markup.
spatialCoverage Used to indicate the region or regions for which announcements are being reported. Each region must be of type: Country, State, City, AdministrativeArea (e.g., for US counties or school districts), or Place (e.g., for a particular retail location for a business).
diseasePreventionInfo Information about disease prevention.
newsUpdatesAndGuidelines Indicates a page with news updates and guidelines.
quarantineGuidelines Guidelines about quarantine rules.
schoolClosuresInfo Information about school closures.
Additional properties as specified by schema.org may also be used.

Government statistics
diseaseSpreadStatistics
If your page has statistics about the spread of COVID-19, you can include a SpecialAnnouncement structured data element with a diseaseSpreadStatistics property. This allows Bing to consider including the statistics from your page in pages related to tracking the spread of COVID-19, such as bing.com/covid.

When this markup is used it is important that the underlying page:

Is an official government site reporting case statistics for your region.
Shows up-to-date data that is consistent with the CSV file referenced in the diseaseSpreadStatistics property.
Includes the updated statistics, which matches the datePosted property in the special announcement.
Marking it up
The schema.org official site contains additional Special Announcement documentation, including example markups in JSON-LD. The following properties represent the minimum information required to be present:

PROPERTY DESCRIPTION
name Name of the announcement. This text should be present on the underlying page.
datePosted Publication date and time of the most recent statistics.
url URL of the page containing the statistics.
category Category of the announcement. Must be from https://www.wikidata.org/wiki/Q81068910 to refer to the COVID-19 outbreak.
spatialCoverage Used to indicate the region or regions for which statistics is being reported. Each region must be of type: Country, State, City or AdministrativeArea. Use the name property to indicate the name of the region. If the list of regions being reported includes all sub-regions of a parent region, just list the parent region. For example, a table listing statistics for all counties in a state should use the state as spatial coverage.
diseaseSpreadStatistics Statistical information about the spread of COVID-19 must be of type Dataset. Use the distribution property, with type DataDownload, to identify the description of the statistics and the URL from which a CSV file with the statistics can be retrieved. The CSV file must contain a header row with labels and one or more data rows.
For example, the following markup in JSON-LD would describe statistics for Washington state in the US reported at 3pm on March 19, 2020 (10pm UTC). The CSV file would contain headers "County", "Positive/Confirmed Cases", and "Deaths", matching the table displayed on https://www.doh.wa.gov/emergencies/coronavirus

<script type="application/ld+json">
{
    "@context": "http://schema.org",
    "@type": "SpecialAnnouncement",
    "name": "2019 Novel Coronavirus (COVID-19) in Washington",
    "datePosted": "2020-03-19T10:00:00Z",
    "url": " https://www.doh.wa.gov/emergencies/coronavirus",
    "category": "https://www.wikidata.org/wiki/Q81068910",
    "spatialCoverage" : {
        "@type": "State",
        "name": "Washington"
    },
    "diseaseSpreadStatistics" : {
        "@type": "Dataset",
        "name" : "Confirmed Cases / Deaths by County",
        "description" : "The number of confirmed cases and deaths for each county in Washington State.",
        "distribution" : {
            "@type": "DataDownload",
            "contentUrl": "http://example.gov/coronavirus-cases.csv",
            "encodingFormat" : "text/csv"
        }
    }
}
</script>

Testing locations
CovidTestingFacility
If your page has information about risk assessments and testing centers for the COVID-19 pandemic, you can include a SpecialAnnouncement structured data element with a gettingTestedInfo property and a CovidTestingFacility within the about property. This allows Bing to consider including the information from your page, when users are seeking information on how to get assessed to see whether getting tested is recommended and, if so, how to locate a nearby testing facility and find instructions for getting tested at that center.

When this markup is used it is important that the underlying page:

Is the official site for a well-known healthcare facility or government health agency.
Includes information on how people should be assessed to see whether getting tested is recommended.
Is owned by a healthcare provider and includes information of URLs and facility locations associated with the service. Listing of other providers facilities is not supported at this time.
Marking it up
The schema.org official site contains additional Special Announcement documentation, including example markups in JSON-LD. The following properties represent the information that we recommend you include as appropriate:

PROPERTY DESCRIPTION
name Required: name of the announcement. This text should be present on the underlying page.
category Required: category of the announcement. Must be from https://www.wikidata.org/wiki/Q81068910 to refer to the COVID-19 outbreak.
datePosted Required: publication date and time of the most recent announcement.
About Required: used to specify the testing facility or facilities. Each must be of type CovidTestingFacility
gettingTestedInfo Required: information about getting tested. This must include guidelines on assessments to see whether getting tested is recommended.
Expires Date when the announcement expires and is no longer useful or available.
Text Text of the announcement, indicating the type of pre-assessment and/or testing offered.
url URL of the page containing the announcements. If present, this must match the URL of the page containing the markup.
Additional properties as specified by schema.org may also be used.

Travel restrictions & guidelines
travelBans and publicTransportClosuresInfo
If your page has announcements about travel restrictions, such as updated hours for transportation, closures, and guidelines for travel related to the spread of COVID-19, you can include a SpecialAnnouncement structured data element with a travelBans or publicTransportClosuresInfo property. This allows Bing to consider including the information on travel restrictions from your page on travel-related search results.

When this markup is used it is important that the underlying page:

Is an official site for a well-known government agency, travel agency, airline, hotel, or other travel providers.
Contains the name of the special announcement at an easily identifiable and visible location.
Includes the date when the restrictions information was updated, which matches the datePosted property in the special announcement.
Marking it up
The schema.org official site contains additional Special Announcement documentation. The following properties represent the information that we recommend you include as appropriate:

PROPERTY DESCRIPTION
name Required: name of the announcement about travel restrictions. This text should be present on the underlying page.
category Required: category of the announcement. Must be from https://www.wikidata.org/wiki/Q81068910 to refer to the COVID-19 outbreak.
datePosted Required: publication date and time of the most recent announcement.
spatialCoverage Required: used to indicate the region or regions for which the restrictions are applicable. These may refer to the starting point and/or destination of travel. Recommended types: Country, State, City, or AdministrativeArea (e.g., for US counties). Use the name property to indicate the name of the regions.
Expires Date when the announcement expires and is no longer useful or available.
Text Text of the announcement. Can be used for simple announcements or as a summary.
url URL of the page containing the announcements. If present, this must match the URL of the page containing the markup.
publicTransportClosuresInfo Information about public transport closures.
travelBans Information about travel bans or other restrictions.
Additional properties as specified by schema.org may also be used.

Sites which misuse these markups may incur ranking penalties, have markup ignored, or not selected for index. For more information on abusive and other inappropriate behaviors to avoid, and the effects it can have on your website, please see our webmaster guidelines. If you or someone you know learn of a site that is engaging in abusive or inappropriate behaviors (described in our webmaster guidelines), we encourage you to report such behavior to us using the feedback link on the bing.com footer.

Link building
Link building is the process of building relationship with websites to get a link from their site to a page in your website. Such links are called backlinks. Bing prefers to see links built organically (i.e, naturally). It means the links are built gradually as people find your content to be unique and of high quality. This is an important signal to search engines as your site is seen as providing trustworthy and authoritative content. Think of your own website, you only link to sources you trust and know will be useful to your visitors.

Organic links like these helped the internet to become a “web”. Organic links are often responsible for something “going viral” on social media. When a content becomes popular, there is a dramatic increase in the number of links pointing towards it. Search engines consider such links to be a sign of valued content.

While seeking links, be mindful that Bing wants to see quality links pointing to your website. A quality link is one that is coming from a website which Bing already knows and trusts. Obtaining links from trusted sites requires hard work, but if you follow a consistent pattern of providing valuable content to your users and share links from your website to others, the trusted links will begin to appear on your website.

Here are some other methods of link building:

Reciprocal linking
In reciprocal linking you agree with another website to exchange links. They point one link to your site, and you point one towards their site. Bing can easily see through such links and assigns limited value to such link exchanges. But don’t skip this as a valid link building strategy. New websites need links, and exchanging a link is a great way to gain trusted inbound links, and can potentially get direct traffic from other websites. Increased traffic can help to get more links as new visitors spread the word about your website.

Buying links
You may choose to buy a link from a trusted website. But Bing can easily see a pattern of links from your website turning off each month, then new ones showing up for a month or so from your website, and we know that you are buying links for your website; any links leaving your website will be suspect. Search engines are good at seeing patterns, so think carefully before purchasing a link for elevated search rankings.

However, buying a link from a busy website can bring you direct traffic, so buying links remain a valid marketing strategy. Just be careful how often you employ this strategy, as Bing may form the impression that you are buying links to influence your organic rankings.

Link farms
We are using this term loosely to refer to any form of link sharing scheme, designed to link sites together with the intent of manipulating organic search rankings. Typical link farms have hundreds or thousands of links to websites, often from old domains which once ranked well themselves but are dormant today. Three-way link exchanges also fall under the same banner and should be avoided.

If you have doubts about a link being potentially dangerous, ask yourself that if you meet a Bing representative at a trade show, would you hesitate to tell that person about the link.

How to build links
The best way to build legitimate inbound links is to create high quality, unique content. When you become known as a trusted source for excellent content, visitors will naturally share links to your website. Social sharing has amplified this process, so be sure to make it easy for your visitors to share what they like in your site. You can encourage them by:

Building unique, engaging content.
Enabling social sharing options for your visitors.
Consider enabling copy-and-paste code snippets to allow visitors to quickly grab code to create a link from their site to your web page.
On your part, you can look for websites from where you would like a link and simply ask them if they would link to your site. It takes some work to uncover the right contact information, but a polite, deserving request can work in your favor.

Another option is to do some guest blogging. Many websites and blogs, in exchange for unique content and article for them, will provide a link back to your website. You need to establish some trust before that, so build your credibility as an expert on a topic before approaching other sites and offering to write a guest blog. Just remember that if they like your work, they will talk about your good work; but if you fail to impress or try anything sneaky, they will blog about it as well.

You can also look into directories, a reliable location to get a trusted link. Directories are still valued, but remember these alone won’t provide your website with higher ranking.

Quality vs. quantity
The fastest way to alert search engines about your website buying links is to have 10,000 new links go live in one day. It is tempting to subscribe to a service that rewards you with thousands of links, but you should avoid this. Bing wants to see quality links pointing to your website; even a few inbound links from trusted websites is enough to help boost your rankings. Just like with content, when it comes to links, quality matters the most.
