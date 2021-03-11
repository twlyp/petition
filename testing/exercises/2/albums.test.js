const { getAlbumNames } = require("./albums");
const spotify = require("./spotify");

jest.mock("./spotify");

test("album names are in alphabetical order", () => {
    spotify.search.mockResolvedValue({
        albums: {
            items: [
                { name: "losing my religion" },
                { name: "vid spilum endalaust" },
                { name: "oops!... i did it again" },
                { name: "abba: the definitive collection" },
            ],
        },
    });

    return getAlbumNames("meat loaf").then((albumNames) => {
        expect(albumNames).toEqual(albumNames.slice().sort());
    });
});
