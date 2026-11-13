module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "that-open-bim-desktop",
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "live_02_bim_desktop",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux"],
    },
  ],
};
