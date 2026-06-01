{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.ffmpeg-full
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
  ];
}
