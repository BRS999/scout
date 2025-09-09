# Steel Browser Integration Examples for Scout

This document showcases how Scout's Steel Browser integration enables powerful browser automation capabilities.

## 🚀 Getting Started

Steel Browser provides REST API access to Chrome/Chromium browser automation. Scout integrates with it through specialized tools.

## 📋 Tool Reference

### Steel Navigate Tool (`steel.navigate`)
Navigate to web pages and perform actions.

```typescript
// Basic navigation
{ url: "https://github.com", actions: [] }

// Navigation with actions
{
  url: "https://example.com",
  actions: [
    { type: "click", selector: "button" },
    { type: "type", selector: "input[name='search']", text: "query" },
    { type: "wait", timeout: 2000 }
  ]
}
```

### Steel Extract Tool (`steel.extract`)
Extract content from web pages using CSS selectors or JavaScript.

```typescript
// Extract text content
{ url: "https://wikipedia.org", selector: "h1", extractType: "text" }

// Extract HTML
{ url: "https://example.com", selector: ".content", extractType: "html" }

// Extract attribute
{ url: "https://example.com", selector: "a", extractType: "attribute", attribute: "href" }
```

### Steel Screenshot Tool (`steel.screenshot`)
Take screenshots of web pages.

```typescript
// Viewport screenshot
{ url: "https://github.com", fullPage: false, format: "png" }

// Full page screenshot
{ url: "https://wikipedia.org", fullPage: true, format: "jpeg" }
```

### Steel Form Fill Tool (`steel.fill_form`)
Fill out forms automatically.

```typescript
{
  url: "https://example.com/contact",
  fields: [
    { selector: "input[name='name']", value: "John Doe" },
    { selector: "input[name='email']", value: "john@example.com" }
  ],
  submitSelector: "button[type='submit']"
}
```

### Steel JavaScript Tool (`steel.javascript`)
Execute JavaScript in the browser context.

```typescript
// Get page title
{ url: "https://cnn.com", script: "document.title", returnResult: true }

// Scroll to bottom
{ url: "https://news.com", script: "window.scrollTo(0, document.body.scrollHeight)", returnResult: false }
```

## 🎯 Example Workflows

### 1. Web Scraping with Content Extraction
**Prompt:** "Extract all article titles from the New York Times homepage"

**Actions:**
```javascript
// 1. Navigate to NYT
{ url: "https://nytimes.com", actions: [] }

// 2. Extract article titles
{ url: "https://nytimes.com", selector: "h2, h3", extractType: "text" }
```

### 2. Form Automation
**Prompt:** "Fill out the contact form on example.com with name John and email john@test.com"

**Actions:**
```javascript
{
  url: "https://httpbin.org/forms/post",
  fields: [
    { selector: "input[name='custname']", value: "John Doe" },
    { selector: "input[name='custtel']", value: "555-0123" },
    { selector: "input[name='custemail']", value: "john@test.com" }
  ],
  submitSelector: "button[type='submit']"
}
```

### 3. Screenshot Documentation
**Prompt:** "Take a screenshot of the React documentation homepage"

**Actions:**
```javascript
{ url: "https://react.dev", fullPage: true, format: "png" }
```

### 4. JavaScript Data Extraction
**Prompt:** "Get all links from a webpage and their text"

**Actions:**
```javascript
{
  url: "https://example.com",
  script: `
    Array.from(document.querySelectorAll('a')).map(link => ({
      text: link.textContent.trim(),
      href: link.href
    }))
  `,
  returnResult: true
}
```

### 5. Multi-step Workflow
**Prompt:** "Search for 'TypeScript' on Google, then take a screenshot of the first result"

**Actions:**
```javascript
// 1. Navigate to Google and search
{
  url: "https://google.com",
  actions: [
    { type: "type", selector: "input[name='q']", text: "TypeScript" },
    { type: "click", selector: "input[value='Google Search']" },
    { type: "wait", timeout: 2000 }
  ]
}

// 2. Take screenshot
{ url: "https://google.com/search?q=TypeScript", fullPage: false, format: "png" }
```

## 🔧 Advanced Usage

### CSS Selector Tips
- Use browser dev tools to find selectors
- Prefer `id` and `name` attributes when available
- Test selectors manually before using in automation

### Common Selectors
```javascript
// Input fields
"input[name='email']"
"input[type='text']"
"textarea"

// Buttons
"button[type='submit']"
"input[type='submit']"
".submit-btn"

// Links and content
"a[href*='github']"
"h1, h2, h3"
".article-title"
```

### Error Handling
- Check if elements exist before interacting
- Use appropriate wait times for dynamic content
- Handle network timeouts gracefully

### Performance Tips
- Use specific selectors to avoid ambiguity
- Wait for elements to be ready before interaction
- Close browser sessions when done
- Limit concurrent sessions for resource management

## 🚨 Best Practices

1. **Respect robots.txt** and website terms of service
2. **Use appropriate delays** between actions
3. **Handle errors gracefully** with try-catch
4. **Test selectors** in browser dev tools first
5. **Limit automation** to avoid being blocked
6. **Clean up sessions** after use

## 🔍 Troubleshooting

### Common Issues

**Element not found:**
- Check if selector is correct
- Wait for page to fully load
- Element might be dynamically loaded

**Network timeouts:**
- Increase timeout values
- Check network connectivity
- Website might be slow

**Session errors:**
- Ensure Steel Browser is running
- Check Docker container status
- Verify API endpoint configuration

---

**Ready to automate? Start with simple navigation and extraction, then build up to complex workflows!** 🤖✨
