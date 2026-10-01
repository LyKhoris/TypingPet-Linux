UUID := typingpet@lykhoris.github.io
PREFIX ?= /usr
DESTDIR ?=
EXTDIR := $(DESTDIR)$(PREFIX)/share/gnome-shell/extensions/$(UUID)
RULEDIR := $(DESTDIR)$(PREFIX)/lib/udev/rules.d

.PHONY: all install uninstall zip clean

all:
	@echo "targets: install, uninstall, zip, clean"

install:
	install -d "$(EXTDIR)"
	install -m644 metadata.json extension.js "$(EXTDIR)/"
	cp -r assets bin "$(EXTDIR)/"
	install -Dm644 data/udev/70-typingpet.rules "$(RULEDIR)/70-typingpet.rules"

uninstall:
	rm -rf "$(EXTDIR)"
	rm -f "$(RULEDIR)/70-typingpet.rules"

zip: dist/$(UUID).zip

dist/$(UUID).zip:
	python3 dev/make-zip.py "$@"

clean:
	rm -rf dist build pkg
