FROM myoung34/github-runner:latest

# Pre-install coscli so CI jobs skip the download step
RUN wget -q "https://cosbrowser.cloud.tencent.com/software/coscli/coscli-linux" \
      -O /usr/local/bin/coscli \
    && chmod +x /usr/local/bin/coscli
