"""Rendering primitives shared by every PDF page (font registration, text
shaping, layout chrome, formatters, locale labels, chart drawing, page-1
section components). Consumers import directly from the submodule (e.g.
`from .i18n import t`) — there's no aggregate re-export here."""
