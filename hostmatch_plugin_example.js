module.exports = {
    name: "MatchNotFound",
    features: ["hostmatch"],
    // host: string of the hostname
    // req: the request object from Node.JS
    // return: string with end URL with the actual host
    // or return null if no match can be given from this match
    // this is a sample plugin that is almost useless, make your code!
    runHostMatch: function(host, req) {
        return "http://localhost:1337";
    }
}