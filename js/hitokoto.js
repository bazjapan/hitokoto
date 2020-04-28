FRZ.exports(["managed_service_plugin"], function(ManagedService) {
	var hitokoto;
	return function(app, hitokoto_opts) {
		if (hitokoto) {
			return hitokoto;
		}
		hitokoto = {
			ui: {}
		};

		hitokoto.service = ManagedService(app, {
		}).manage("hitokoto");
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

		hitokoto.get_helper = function(key, obj_type, on_data) {
			var hitokoto_helper = {};
			var items = [];
			hitokoto_helper.get_data = function() {
				return items;
			}
			var obj_id;
			hitokoto_helper.add = function(txt, done) {
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
			hitokoto_helper.clear_all = function(done) {
				return hitokoto.remove_by_obj_id(obj_id, obj_type, key, done);
			}
			hitokoto_helper.remove = function(item, done) {
				return hitokoto.remove_item(item, done);
			}
			hitokoto_helper.ldr = hitokoto.service.loobs.use("get_items", {
				on_change: function(ldr_val, mdata) {
					items = ldr_val;
					items.sort(app.utils.sort_by_param("da", 1, function(v) {
						return parseInt(v);
					}))
					return on_data(null);
				},
				on_error: function(err) {
					return on_data(err);
				}
			});
			hitokoto_helper.load = function(_obj_id) {
				if (obj_id != _obj_id) {
					obj_id = _obj_id;
					hitokoto_helper.ldr.load({
						key: key,
						obj_id: obj_id,
						obj_type: obj_type
					});
				}
				return;
			}
			return hitokoto_helper;
		}

		var dom = app.dom;
		hitokoto.translations = {
			en: {
				comment : "Comment",
				add_comment: "Add Comment",
				cancel: "Cancel",
				submit: "Comment",
				no_comments: "No Comments",
				remove_comment_lbl: "Remove",
				remove_all: "Remove All"
			},
			ja: {
				comment : "コメント",
				add_comment: "コメントを追加",
				cancel: "キャンセル",
				submit: "コメント",
				no_comments: "コメントはありません",
				remove_comment_lbl: "削除する",
				remove_all: "すべて削除する"
			}
		}
		app.add_translations(hitokoto.translations);

		hitokoto.icons = {
			add_comment: "plus",
			remove_comment: "remove",
			comment_menu: "ellipsis_vertical"
		}

		hitokoto.ui.list = function(attrs) {
			var memo = app.utils.stobber(attrs.id || "hitokoto_list", {});
			var items = attrs.items;
			attrs = attrs || {};
			var check_can_remove = function(item){
				return attrs.can_remove && item.u_id === "poop";
			}
			var get_list = function() {
				if (items.length === 0) {
					return dom.div(null, dom.p(null, app.lbl("no_comments")));
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

				}
				var get_menu = function(item) {
					var btns = [];
					if (check_can_remove(item)) {
						btns.push(dom.bj.btn({
							lbl: app.lbl("remove_comment_lbl"),
							icon_right: hitokoto.icons.remove_comment,
							onClick: function() {
								app.popit.hide();
								return attrs.on_remove(item);
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
				}
				return dom.bj.lt({
					zen: {}
				}, items.map(function(item) {
					return dom.bj.lt_media_item({
						src: (item.u_p || FRZ.default_account_photoURL)
					}, [get_menu(item), dom.p(null, item.txt)], [dom.span({}, item.u_n)]);
				}))
			}
			var do_submit = function() {
				var txt = memo.el.value;
				txt = txt.trim();
				if (txt) {
					attrs.on_add(txt, function on_added() {
						return memo.el.value = "";
					})
				}
			}
			var do_cancel = function() {
				return memo.el.value = "";
			}
			var get_clear_all_btn = function() {
				if (attrs.can_remove_all && items.length) {
					return dom.bj.btn({
						className: "bj_btn_danger",
						icon: "remove",
						lbl: app.lbl("remove_all"),
						onClick: function(e){
							app.confirm(app.lblwn("remove_pname", "comment"), function(){
								app.alert.show("lets remove");
							})
						}
					})
				}
			}
			var get_comment_area = function() {

				var get_input = function() {
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
				var get_btns = function(){
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
				return dom.div(null, get_input(), 
				dom.bj.contentbar(get_clear_all_btn(), null, get_btns()));
			}

			return dom.div({
				className: "lt_hitokoto_comments"
			}, get_comment_area(), get_list(items));
		}

		return app.globalize("hitokoto", hitokoto);
	}

});
