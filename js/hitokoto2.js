FRZ.exports(["managed_service_plugin"], function(ManagedService) {
	var hitokoto;
	return function(app, opts) {
		if (hitokoto) {
			return hitokoto;
		}
		hitokoto = {
			ui: {}
		};
		hitokoto.service = ManagedService(app, {}).manage("hitokoto");
		hitokoto.service.add_methods("add_item", "remove_item", "remove_by_obj_id");
		hitokoto.add_item = function(item, done) {
			return hitokoto.service.methods.add_item({
				vo: item,
				key: item.key
			}, done)
		}
		hitokoto.remove_item = function(item, done) {
			return hitokoto.service.methods.remove_item({
				_id: item._id,
				obj_id: item.obj_id,
				obj_type: item.obj_type,
				key: item.key
			}, done)
		}
		hitokoto.service.action_handlers.remove_by_obj_id = function(loob, mdata, done) {
			loob.set_value([]);
			return done(null, true);
		}
		hitokoto.remove_by_obj_id = function(obj_id, obj_type, key, done) {
			return hitokoto.service.methods.remove_by_obj_id({
				obj_id: obj_id,
				obj_type: obj_type,
				key: key
			}, done)
		}
		hitokoto.service.loobs.register({
			qn: "get_items"
		});
		hitokoto.models = [];
		hitokoto.create_model = function(on_data) {
			var model = {};
			var items = [];
			var last_query_alias;
			model.add = function(txt, key, obj_id, obj_type, done) {
				var hk_id = app.utils.make_id("hitokoto");
				var entry = {
					da: app.utils.create_num_date(null, true),
					tzo: app.tzo,
					key: key,
					obj_id: obj_id,
					obj_type: obj_type,
					hk_id: hk_id,
					txt: txt,
					u_id: app.get_u_id(),
					u_n: app.get_u_n("unknown"),
					u_p: app.get_u_p()
				}
				hitokoto.add_item(entry, done);
			}
			model.clear_all = function(key, obj_id, obj_type, done) {
				return hitokoto.remove_by_obj_id(obj_id, obj_type, key, done);
			}
			model.remove = function(item, done) {
				return hitokoto.remove_item(item, done);
			}
			model.ldr = hitokoto.service.loobs.use("get_items", {
				on_change: function(ldr_val, mdata) {
					items = ldr_val;
					items.sort(app.utils.sort_by_param("da", 1, function(v) {
						return parseInt(v);
					}))
					return on_data(null, "data");
				},
				on_error: function(err) {
					return on_data(err);
				}
			});
			model.load = function(key, obj_id, obj_type) {
				var alias = [key, obj_id, obj_type].join("__");
				if (alias != last_query_alias) {
					last_query_alias = alias;
					model.ldr.load({
						key: key,
						obj_id: obj_id,
						obj_type: obj_type
					});
				}
				return items;
			}
			if(FRZ.is_dev){
				hitokoto.models.push(model);
			}
			return model;
		}

		var dom = app.dom;
		hitokoto.translations = app.add_translations({
			en: {
				comment: "Comment",
				add_comment: "Add Comment",
				cancel: "Cancel",
				submit: "Comment",
				no_comments: "No Comments",
				remove_comment_lbl: "Remove",
				remove_all: "Remove All"
			},
			ja: {
				comment: "コメント",
				add_comment: "コメントを追加",
				cancel: "キャンセル",
				submit: "コメント",
				no_comments: "コメントはありません",
				remove_comment_lbl: "削除する",
				remove_all: "すべて削除する"
			}
		});

		hitokoto.icons = {
			add_comment: "plus",
			remove_comment: "remove",
			comment_menu: "ellipsis_vertical"
		}
		var render_clear_all_btn = function(attrs, memo) {
			if (attrs.can_remove_all && memo.items.length) {
				return dom.bj.btn({
					className: "bj_btn_danger",
					icon: "remove",
					lbl: app.lbl("remove_all"),
					onClick: function(e) {
						app.confirm(app.lblwn("remove_pname", "comment"), function() {
							return attrs.model.clear_all(attrs.key, attrs.obj_id, attrs.obj_type, function(err, res) {})
						})
					}
				})
			}
		}

		var render_comment_area = function(attrs, memo) {
			var render_input = function() {
				if (!attrs.can_comment) {
					return null;
				}
				return dom.bj.input({
					it: "ta",
					ref: function(el) {
						return memo.el = el;
					},
					maxLength: 160,
					placeholder: app.lbl("add_comment"),
					zen: {
						___cache: "hitoko_add_comment_ta",
						h: 80,
						resize: "none",
						w: "100%",
						mb: 5
					}
				})
			}
			var do_submit = function() {
				var txt = memo.el.value;
				txt = txt.trim();
				if (txt) {
					attrs.model.add(txt, attrs.key, attrs.obj_id, attrs.obj_type, function on_added() {
						return memo.el.value = "";
					})
				}
			}
			var do_cancel = function() {
				return memo.el.value = "";
			}
			var render_btns = function() {
				if (!attrs.can_comment) {
					return null;
				}
				return [dom.bj.btn({
					lbl: app.lbl("cancel"),
					onClick: do_cancel,
					className: "btn_cancel"
				}), dom.bj.btn({
					lbl: app.lbl("submit"),
					icon_right: hitokoto.icons.add_comment,
					onClick: do_submit,
					className: "btn_comment"
				})]
			}
			return dom.div(null, render_input(), dom.bj.contentbar(render_clear_all_btn(attrs, memo), null, render_btns()));
		};
		var check_can_remove = function(attrs, item) {
			return attrs.can_remove_all || attrs.can_remove && item.u_id === app.get_u_id();
		}
		var show_menu_pop = function(x, y, item, btns) {
			var w = 120;
			return app.popit.toggle({
				initiator: "hitokoto_" + item._id,
				left: x - w,
				top: y,
				render: function(dom, popper) {
					return dom.bj.vbox({
						zen: {
							w: w,
							ai: "fe"
						}
					}, dom.span({
						className: "hitokoto_menupop_bg"
					}, btns));
				},
				ann: x === 3 ? "slideInRight" : ""
			})

		};
		var render_menu = function(attrs, item) {
			var btns = [];
			if (check_can_remove(attrs, item)) {
				btns.push(dom.bj.btn({
					lbl: app.lbl("remove_comment_lbl"),
					icon_right: hitokoto.icons.remove_comment,
					onClick: function() {
						app.popit.hide();
						return attrs.model.remove(item, function(err, res) {});
					}
				}))
			}
			if (!btns.length) {
				return null;
			}
			return dom.bj.btn({
				zen: {
					pos: "a",
					t: 2,
					r: 2
				},
				icon: hitokoto.icons.comment_menu,
				onClick: function(e) {
					var r = e.currentTarget.getBoundingClientRect();
					return show_menu_pop(r.left + r.width, r.top + r.height, item, btns);
				}
			});
		};
		var formatted_dates = {};
		var get_fomatted_date = function(da){
			if(formatted_dates[da]){
				return formatted_dates[da];
			}
			return formatted_dates[da] = app.utils.fmt_num_date(da, 0);
		}
		var render_list = function(attrs, memo) {
			if (memo.items.length === 0) {
				return dom.div(null, dom.p(null, app.lbl("no_comments")));
			}

			return dom.bj.lt({
				zen: {
					mah: attrs.max_list_height,
					ovx: "h"
				}
			}, memo.items.map(function(item) {
				return dom.bj.lt_media_item({
					src: (item.u_p || FRZ.default_account_photoURL)
				}, [render_menu(attrs, item),
				dom.p(null, item.txt)], [dom.p({}, get_fomatted_date(item.da)), dom.p({}, item.u_n)]);
			}))
		}
		
		var render_commnet_list_body = function(attrs, memo) {
			if (attrs.input_below) {
				return [render_list(attrs, memo), render_comment_area(attrs, memo)];
			}
			return [render_comment_area(attrs, memo), render_list(attrs, memo)];
		}
		hitokoto.ui.list = function(attrs) {
			//should pass an id
			var memo = app.utils.stobber(attrs.id || "hitokoto_list", {});
			memo.items = attrs.model.load(attrs.key, attrs.obj_id, attrs.obj_type);
			if (attrs.asc) {
				memo.items = memo.items.concat().reverse();
			}
			return dom.div({
				className: "lt_hitokoto_comments"
			}, render_commnet_list_body(attrs, memo));
		}

		return app.globalize("hitokoto", hitokoto);
	}

});
